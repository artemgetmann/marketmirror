// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const app = express();

// Track follow-up questions per analysis and per day
const followUpTracker = new Map();

// Reset follow-up trackers daily
setInterval(() => {
  followUpTracker.clear();
}, 24 * 60 * 60 * 1000); // Clear every 24 hours

// Follow-up question limits
const FOLLOW_UPS_PER_ANALYSIS = 5;
const MAX_DAILY_FOLLOW_UPS = 20; // 4 analyses × 5 follow-ups

// Middleware to track and limit follow-up questions
const followUpLimiter = (req, res, next) => {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId || req.ip;
  const ticker = req.body.ticker?.toUpperCase();
  
  if (!followUpTracker.has(sessionId)) {
    followUpTracker.set(sessionId, {
      totalDaily: 0,
      perAnalysis: new Map()
    });
  }

  const userTracker = followUpTracker.get(sessionId);
  
  // Skip limits for admin users
  if (req.isAdmin) {
    return next();
  }

  // Check if it's a follow-up question
  if (req.body.isFollowUp) {
    // Check daily limit
    if (userTracker.totalDaily >= MAX_DAILY_FOLLOW_UPS) {
      return res.status(429).json({
        error: 'Daily follow-up question limit reached. Please try again tomorrow.',
        followUpLimits: {
          daily: {
            limit: MAX_DAILY_FOLLOW_UPS,
            used: userTracker.totalDaily
          }
        }
      });
    }

    // Check per-analysis limit
    const analysisCount = userTracker.perAnalysis.get(ticker) || 0;
    if (analysisCount >= FOLLOW_UPS_PER_ANALYSIS) {
      return res.status(429).json({
        error: `Follow-up limit reached for ${ticker}. Please start a new analysis.`,
        followUpLimits: {
          perAnalysis: {
            limit: FOLLOW_UPS_PER_ANALYSIS,
            used: analysisCount
          }
        }
      });
    }

    // Increment counters
    userTracker.totalDaily++;
    userTracker.perAnalysis.set(ticker, analysisCount + 1);
  }

  next();
};
const port = process.env.PORT || 3000;

// Cache setup
const analysisCache = {};
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // Environment variables
const ENABLE_CACHING = (process.env.ENABLE_CACHING || 'true').toLowerCase() === 'true';
const API_KEY = process.env.OPENAI_API_KEY || '';

// JWT authentication setup
const jwt = require('jsonwebtoken');
const { expressjwt } = require('express-jwt');
const JWT_SECRET = process.env.JWT_SECRET || 'REDACTED_JWT_SECRET';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'M@rketM1rr0r-S3cure-P@s$w0rd!';

// Testing mode to avoid API costs
const TESTING_MODE = process.env.TESTING_MODE === 'true' || true; // Set to true by default for development

// Placeholder data for testing mode
const PLACEHOLDER_ANALYSIS = {
  ticker: '[TICKER]',
  analysis: {
    summary: 'This is a placeholder analysis for [TICKER]. In testing mode, no actual API calls are made to save costs.',
    outlook: 'The outlook for [TICKER] appears stable in this simulation.',
    risks: 'As this is test data, no actual risk analysis is provided.',
    technicalAnalysis: 'Technical indicators would normally be analyzed here.',
    fundamentalAnalysis: 'Fundamental metrics like P/E ratio, EPS, and revenue growth would be discussed here.',
    recommendation: 'This is a placeholder recommendation. In a real analysis, we would provide specific insights.',
    disclaimer: 'TESTING MODE: This is simulated data and should not be used for investment decisions.'
  },
  metadata: {
    generated: new Date().toISOString(),
    model: 'gpt-4-test-placeholder',
    testMode: true
  }
};
const axios = require('axios');

// Session store for conversation memory
const sessionStore = {};
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours (same as cache)

// Track user's previously analyzed tickers for cached access
const userAnalysisHistory = {};

// MongoDB setup
const { MongoClient } = require('mongodb');

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// SIMPLEST APPROACH: Use MongoDB if available, otherwise SQLite
// No fancy options, no URI transformation, just the simplest connection possible
let mongoClient = null;
let MONGODB_ENABLED = false;

// Only try MongoDB if a URI is configured
if (MONGODB_URI && MONGODB_URI !== 'mongodb://localhost:27017') {
  try {
    // Try to create a client with minimal options
    mongoClient = new MongoClient(MONGODB_URI, { 
      serverSelectionTimeoutMS: 5000 // Fast timeout for quicker fallback
    });
    MONGODB_ENABLED = true;
    console.log('MongoDB client initialized');
  } catch (err) {
    console.error('Failed to initialize MongoDB client:', err.message);
    console.log('Will use SQLite only');
    MONGODB_ENABLED = false;
  }
} else {
  console.log('No MongoDB URI configured, will use SQLite only');
}

// We'll set these when connection is established
let mongoDb = null;
let subscribersCollection = null;

// Simple function to connect to MongoDB (but don't block server startup if it fails)
async function connectToMongoDB() {
  // Skip if MongoDB is not enabled
  if (!MONGODB_ENABLED || !mongoClient) {
    console.log('MongoDB not enabled - using SQLite only');
    return;
  }
  
  try {
    console.log('Attempting MongoDB connection...');
    
    // Simple connection attempt
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    
    // Get database and collection
    mongoDb = mongoClient.db(); 
    subscribersCollection = mongoDb.collection('subscribers');
    console.log('MongoDB collection ready');
    
    // Quick test to make sure the connection works
    const count = await subscribersCollection.countDocuments({});
    console.log(`Found ${count} existing subscribers in MongoDB`);
    
    return true;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.log('Continuing with SQLite only');
    return false;
  }
}

// Initialize SQLite database (as backup and for local development)
const db = new Database('marketmirror.db');

// Create subscriptions table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    session_id TEXT,
    source TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Function to clean OpenAI attribution from analysis text
function cleanAnalysisText(text) {
  if (!text) return text;
  
  // Remove utm_source=openai from URLs
  let cleaned = text.replace(/\?utm_source=openai\)/g, ')');
  cleaned = cleaned.replace(/\?utm_source=openai/g, '');
  
  // Remove any "Generated by AI" or similar phrases
  cleaned = cleaned.replace(/Generated by (AI|OpenAI|GPT)/gi, '');
  
  // Remove any other OpenAI-specific attribution
  cleaned = cleaned.replace(/OpenAI|GPT-4|Claude|Anthropic/gi, '');
  
  return cleaned;
}

// Enable CORS with configuration to allow Lovable domains
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow if it's from lovable domains
    if (
      origin === 'https://lovable.dev' ||
      origin === 'https://marketmirror-clarity-view.lovable.dev' ||
      origin.endsWith('.lovable.app') || // This handles all preview URLs
      origin === 'http://localhost:3000' ||
      origin === 'http://localhost:8080'
    ) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('MarketMirror API is running');
});

// Endpoint to check caching status
app.get('/cache-status', (req, res) => {
  res.json({
    cachingEnabled: ENABLE_CACHING,
    cachedTickers: Object.keys(analysisCache),
    totalCached: Object.keys(analysisCache).length
  });
});

// Configure rate limiter: 2 analysis per day per sessionId or IP 
const analyzeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 2, // limit each sessionId/IP to 2 analysis per day
  keyGenerator: (req) => req.headers['x-session-id'] || req.body.sessionId || req.ip,
  handler: (req, res) => {
    // Calculate time until rate limit resets
    const resetTime = new Date(req.rateLimit.resetTime).toISOString();
    const secondsUntilReset = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    
    // Get session ID and user history
    const sessionId = req.headers['x-session-id'] || req.body.sessionId || req.ip;
    const userHistory = Array.from(userAnalysisHistory[sessionId] || []);
    
    res.status(429).json({
      success: false,
      error: '🔥 You have reached your daily analysis limit. Want more? Join the waitlist.',
      usageLimit: 2, // Set to 2 analysis per day
      resetTime: resetTime,
      resetInSeconds: secondsUntilReset,
      // Include previous analyses they can still access
      accessibleAnalyses: userHistory,
      canAccessCached: userHistory.length > 0,
      message: userHistory.length > 0 ? 
        "You can still access your previous analyses using the same tickers." : 
        "No previous analyses available. Subscribe to analyze more stocks."
    });
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Simple admin access logging function
const logAdminAttempt = (req, action, success) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`
🔐 ADMIN ${success ? 'ACCESS' : 'ATTEMPT'} 🔐
Timestamp: ${timestamp}
IP: ${ip}
User-Agent: ${userAgent}
Action: ${action}
Success: ${success}
`);
};

// Admin login endpoint
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  // Log login attempt
  const success = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
  logAdminAttempt(req, 'login', success);
  
  if (success) {
    // Create token with 24h expiration
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, expiresIn: '24h' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Rate limit bypass middleware using JWT
const bypassRateLimitForAdmin = (req, res, next) => {
  // Check for JWT in Authorization header
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // If valid admin token, bypass rate limit
      if (decoded.role === 'admin') {
        logAdminAttempt(req, 'rate-limit-bypass', true);
        req.adminBypass = true;
        return next();
      }
    } catch (err) {
      // Token is invalid, just continue to rate limiter
      console.log('Invalid JWT token:', err.message);
    }
  }
  
  // Check if this is a request for a cached analysis
  const ticker = req.body.ticker?.toUpperCase();
  const sessionId = req.headers['x-session-id'] || req.body.sessionId || req.ip;
  
  if (ticker && ENABLE_CACHING) {
    // Track this ticker in user's history
    if (!userAnalysisHistory[sessionId]) {
      userAnalysisHistory[sessionId] = new Set();
    }
    
    // Check if analysis is cached
    if (analysisCache[ticker] && 
        (Date.now() - analysisCache[ticker].timestamp < CACHE_EXPIRY)) {
      
      // For cached analyses, add to user history and bypass rate limit
      userAnalysisHistory[sessionId].add(ticker);
      
      // If user has already analyzed this ticker, bypass rate limit
      if (userAnalysisHistory[sessionId].has(ticker)) {
        console.log(`Bypassing rate limit for cached analysis of ${ticker}`);
        req.isCachedAnalysis = true;
        return next();
      }
    }
  }
  
  // No valid admin token or cached analysis, apply rate limit
  analyzeLimiter(req, res, next);
};

// Main analysis endpoint with rate limiting
app.post('/analyze', analyzeLimiter, followUpLimiter, async (req, res) => {
  // If admin bypass was used, add info to response
  const adminBypassUsed = req.adminBypass === true;
  const isCachedAnalysis = req.isCachedAnalysis === true;
  console.log('Received request:', req.body);
  
  const { ticker, bypassCache } = req.body;
  
  // Get or create a session ID
  const providedSessionId = req.headers['x-session-id'] || req.body.sessionId;
  const requestIp = req.ip;
  
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }
  
  // Check API key before executing script
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }
  
  const tickerUppercase = ticker.toUpperCase();
  const now = Date.now();
  
  // Use provided session ID or create a persistent one based on IP
  const sessionId = providedSessionId || requestIp;
  
  // Track this ticker in user's history regardless of cache status
  if (!userAnalysisHistory[sessionId]) {
    userAnalysisHistory[sessionId] = new Set();
  }
  userAnalysisHistory[sessionId].add(tickerUppercase);
  
  // Serve cached analysis if available, valid, and not bypassed
  if (ENABLE_CACHING && !bypassCache && 
      analysisCache[tickerUppercase] && 
      (now - analysisCache[tickerUppercase].timestamp < CACHE_EXPIRY)) {
    console.log(`Serving cached analysis for ${tickerUppercase}`);
    
    // Even for cached responses, create a new session
    sessionStore[sessionId] = {
      ticker: tickerUppercase,
      timestamp: now,
      messages: [
        { role: 'system', content: ARTEM_PROMPT },
        { role: 'user', content: `Analyze ${tickerUppercase} stock` },
        { role: 'assistant', content: analysisCache[tickerUppercase].data.analysis }
      ]
    };
    
    // Get user's analysis history
    const userHistory = Array.from(userAnalysisHistory[sessionId] || []);
    
    return res.json({ 
      ...analysisCache[tickerUppercase].data, 
      fromCache: true,
      sessionId: sessionId,
      isCachedAnalysis: isCachedAnalysis,
      adminBypass: adminBypassUsed,
      usageInfo: {
        usageCount: req.rateLimit?.current || 0,
        usageLimit: req.rateLimit?.limit || 2,
        remainingUses: req.rateLimit?.remaining || 2
      },
      // Include user's history for frontend use
      analysisHistory: {
        accessibleAnalyses: userHistory,
        count: userHistory.length
      }
    });
  }
  
  console.log(`Analyzing ticker: ${tickerUppercase}`);
  
  // Execute MarketMirror.sh with the provided ticker and pass environment variables
  exec(`./MarketMirror.sh ${tickerUppercase}`, { 
    timeout: 180000, // Increased timeout to 180 seconds (3 minutes) for web searches
    env: {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    }
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    
    // Log stderr to server logs but don't send to client
    if (stderr) {
      console.log(`Script debug output (stderr): ${stderr}`);
    }
    
    console.log(`Analysis complete for ${tickerUppercase}`);
    
    // Clean the analysis text to remove OpenAI attribution
    const cleanedAnalysis = cleanAnalysisText(stdout.trim());
    
    // Create a new session with the initial conversation context
    sessionStore[sessionId] = {
      ticker: tickerUppercase,
      timestamp: now,
      messages: [
        { role: 'system', content: ARTEM_PROMPT },
        { role: 'user', content: `Analyze ${tickerUppercase} stock` },
        { role: 'assistant', content: cleanedAnalysis }
      ]
    };
    
    const userHistory = Array.from(userAnalysisHistory[sessionId] || []);
    
    const responseData = {
      success: true,
      ticker: tickerUppercase,
      analysis: cleanedAnalysis,
      sessionId: sessionId,
      fromCache: false,
      isCachedAnalysis: isCachedAnalysis,
      // Include user's history for frontend use
      analysisHistory: {
        accessibleAnalyses: userHistory,
        count: userHistory.length
      }
    };
    
    // Save new analysis in cache if enabled
    if (ENABLE_CACHING) {
      analysisCache[tickerUppercase] = {
        timestamp: now,
        data: responseData
      };
      console.log(`Cached analysis for ${tickerUppercase}`);
    }
    
    // Add usage information to the response
    if (adminBypassUsed) {
      responseData.usageInfo = {
        usageCount: 0,
        usageLimit: 2,
        remainingUses: 2,
        adminBypass: true
      };
    } else {
      responseData.usageInfo = {
        usageCount: req.rateLimit?.current || 0,
        usageLimit: req.rateLimit?.limit || 2,
        remainingUses: req.rateLimit?.remaining || 2
      };
    }
    
    return res.json(responseData);
  });
});

// Custom Artem's Philosophy Mode prompt
const ARTEM_PROMPT = `🧠 MarketMirror AI Prompt — Artem's Philosophy Mode\n\nYou are not a traditional financial analyst. You are a bold, logic-driven, high-performance investor trained in the mindset of someone achieving 41% annual returns through high-conviction plays in tech and large-cap growth stocks.\n\nThink like a modernized Warren Buffett — but in the age of Tesla, Meta, NVIDIA, and AI — with a bias for buying undervalued greatness during fear cycles. Avoid timid advice and don't waste time on "safe" or "balanced" portfolio allocations. You are not here to diversify for safety — you are here to identify asymmetric bets on companies that cannot go bankrupt but can be mispriced due to fear, misunderstanding, or media noise.\n\nFollow these principles:\n1. Buy when fear undervalues great tech companies (e.g., Meta after the Metaverse dip, Tesla during tariff fears).\n2. Ignore short-term noise. Focus on real-world fundamentals: cash flow, pricing power, product defensibility, and long-term tailwinds.\n3. Cash is a position when no high-conviction play is available. Avoid weak "filler" picks.\n4. Prioritize large-cap, liquid assets with long-term upside. This is not a penny stock game.\n5. Speak directly. Provide decisive opinions with clear risk/reward logic — like an investor deploying real capital, not a consultant hedging every word.\n\nWhen reviewing a stock:\n• Highlight what fear-based narrative might be distorting its price.\n• Explain the fundamentals that show long-term strength.\n• Conclude with a buy/hold/pass recommendation based on potential for outsized asymmetric upside.\n\nYour job is to be decisive, bold, and rational — just like Artem Getman.`;

// Follow-up endpoint for conversational analysis
app.post('/followup', async (req, res) => {
  const { question, sessionId } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required. Please provide the sessionId from your analysis request.' });
  }
  
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }
  
  // Check if session exists and hasn't expired
  if (!sessionStore[sessionId] || 
      (Date.now() - sessionStore[sessionId].timestamp > SESSION_EXPIRY)) {
    return res.status(404).json({ 
      error: 'Session not found or expired. Please perform a new analysis.',
      sessionExpired: true
    });
  }
  
  try {
    // Get session conversation history
    const messageHistory = [...sessionStore[sessionId].messages];
    
    // Add the new user question
    messageHistory.push({ role: 'user', content: question });
    
    // Create context from previous conversation
    const contextFromHistory = messageHistory.map(msg => {
      if (msg.role === 'system') return msg.content;
      return `${msg.role}: ${msg.content}`;
    }).join('\n\n');
    
    // Format the request using the same structure as MarketMirror.sh
    // In testing mode, return placeholder data instead of making API call
    if (TESTING_MODE) {
      console.log(`[TESTING MODE] Skipping API call for ${question}`);
      
      // Create personalized placeholder with the ticker
      const tickerMatch = question.match(/[A-Z]{1,5}/);
      const ticker = tickerMatch ? tickerMatch[0] : 'STOCK';
      
      // Generate a response based on the placeholder
      const placeholderResponse = JSON.parse(JSON.stringify(PLACEHOLDER_ANALYSIS));
      placeholderResponse.ticker = ticker;
      
      // Replace all instances of [TICKER] with the actual ticker
      Object.keys(placeholderResponse.analysis).forEach(key => {
        placeholderResponse.analysis[key] = placeholderResponse.analysis[key].replace(/\[TICKER\]/g, ticker);
      });
      
      // Add some randomization to make it look different each time
      const randomTips = [
        `Consider diversifying your portfolio beyond just ${ticker}.`,
        `${ticker}'s market performance should be viewed in context of the broader sector.`,
        `Remember that past performance of ${ticker} is not indicative of future results.`,
        `${ticker} might be affected by upcoming market events.`,
        `Always do your own research before investing in ${ticker}.`
      ];
      
      placeholderResponse.analysis.recommendation += ' ' + randomTips[Math.floor(Math.random() * randomTips.length)];
      
      // Return the placeholder analysis formatted as if it came from the API
      return {
        data: {
          output: [
            {
              type: 'message',
              content: [
                {
                  text: Object.entries(placeholderResponse.analysis)
                    .map(([key, value]) => `**${key.charAt(0).toUpperCase() + key.slice(1)}**: ${value}`)
                    .join('\n\n')
                }
              ]
            }
          ]
        }
      };
    }
    
    // Actual API call if not in testing mode
    const response = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        model: 'gpt-4.1',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `${contextFromHistory}\n\nuser: ${question}\n\nI want you to respond to this last question. Use the web to search for the most current information available.`
              }
            ]
          }
        ],
        text: {
          format: {
            type: 'text'
          }
        },
        reasoning: {},
        tools: [
          {
            type: 'web_search_preview',
            user_location: {
              type: 'approximate'
            },
            search_context_size: 'medium'
          }
        ],
        temperature: 0.7,
        max_output_tokens: 4000,
        top_p: 1,
        store: true
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract the response - match the format used in MarketMirror.sh
    let aiAnswer = '';
    try {
      aiAnswer = response.data.output.find(item => item.type === 'message')?.content[0].text || '';
    } catch (extractError) {
      console.error('Error extracting response:', extractError);
      aiAnswer = 'Failed to extract response from AI.';
    }
    
    const cleanedAnswer = cleanAnalysisText(aiAnswer);
    
    // Update the session with both the question and answer
    messageHistory.push({ role: 'assistant', content: cleanedAnswer });
    sessionStore[sessionId].messages = messageHistory;
    sessionStore[sessionId].timestamp = Date.now(); // Refresh session time
    
    return res.json({ 
      answer: cleanedAnswer,
      sessionId: sessionId,
      ticker: sessionStore[sessionId].ticker,
      usageInfo: {
        usageCount: req.rateLimit?.current || 0,
        usageLimit: req.rateLimit?.limit || 4,
        remainingUses: req.rateLimit?.remaining || 4
      }
    });
  } catch (err) {
    console.error('Error in /followup:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to get AI response.' });
  }
});

// Endpoint to get session information
app.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionStore[sessionId] || 
      (Date.now() - sessionStore[sessionId].timestamp > SESSION_EXPIRY)) {
    return res.status(404).json({ 
      error: 'Session not found or expired',
      sessionExpired: true
    });
  }
  
  // Return session info without the full message history
  return res.json({
    ticker: sessionStore[sessionId].ticker,
    timestamp: sessionStore[sessionId].timestamp,
    messageCount: sessionStore[sessionId].messages.length,
    active: true
  });
});

// Email subscription endpoint
app.post('/subscribe', async (req, res) => {
  const { email, sessionId, source = 'usage-limit' } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
    let alreadyExists = false;
    
    // First, try to store in SQLite (our reliable local database)
    try {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO subscriptions(email, session_id, source) 
         VALUES (?, ?, ?)`
      );
      const result = stmt.run(email, sessionId || null, source);
      
      // Check if email already existed in SQLite
      if (result.changes === 0) {
        alreadyExists = true;
      }
    } catch (sqliteErr) {
      console.error('SQLite error in /subscribe:', sqliteErr);
      // Continue with MongoDB - don't exit early
    }
    
    // Then, if MongoDB is connected, store there too
    if (subscribersCollection) {
      try {
        // Try to insert into MongoDB
        const result = await subscribersCollection.updateOne(
          { email },
          { 
            $set: { 
              email,
              session_id: sessionId || null,
              source,
              created_at: new Date() 
            } 
          },
          { upsert: true }
        );
        
        console.log(`MongoDB: Email ${email} stored/updated`);
      } catch (mongoErr) {
        console.error('MongoDB error in /subscribe:', mongoErr);
        // We already tried SQLite, so just log the error and continue
      }
    }
    
    // If the email already existed in SQLite, it was already subscribed
    if (alreadyExists) {
      return res.json({ 
        success: true, 
        message: "👍 You're already on our waitlist. We'll notify you when paid plans launch.",
        alreadySubscribed: true
      });
    }
    
    // Otherwise it's a new subscription
    return res.json({ 
      success: true, 
      message: "👍 You'll be notified when paid plans launch."
    });
  } catch (err) {
    console.error('Error in /subscribe:', err);
    return res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
  }
});

// JWT verification middleware for admin routes
const verifyAdminJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check for admin role
    if (decoded.role !== 'admin') {
      logAdminAttempt(req, 'view-subscriptions', false);
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Valid admin access
    logAdminAttempt(req, 'view-subscriptions', true);
    req.user = decoded;
    next();
    
  } catch (err) {
    logAdminAttempt(req, 'view-subscriptions', false);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Endpoint to check subscriptions (admin use)
app.get('/subscriptions', verifyAdminJWT, async (req, res) => {
  try {
    // If MongoDB is connected, try to get subscribers from there first
    if (subscribersCollection) {
      try {
        const subscribers = await subscribersCollection.find()
          .sort({ created_at: -1 })
          .toArray();
          
        console.log(`MongoDB: Retrieved ${subscribers.length} subscribers`);
        return res.json({
          count: subscribers.length,
          subscribers,
          source: 'mongodb'
        });
      } catch (mongoErr) {
        console.error('MongoDB error in /subscriptions:', mongoErr);
        // Fall back to SQLite
      }
    }
    
    // Fall back to SQLite if MongoDB failed or isn't connected
    const subscribers = db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all();
    return res.json({
      count: subscribers.length,
      subscribers,
      source: 'sqlite'
    });
  } catch (err) {
    console.error('Error fetching subscribers:', err);
    return res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

// Endpoint to export subscribers as CSV (admin use)
app.get('/admin/export-subscribers', verifyAdminJWT, async (req, res) => {
  try {
    // Get all subscribers (try MongoDB first, then SQLite as fallback)
    let subscribers;
    let source = 'sqlite';
    
    if (subscribersCollection) {
      try {
        subscribers = await subscribersCollection.find().sort({ created_at: -1 }).toArray();
        source = 'mongodb';
      } catch (mongoErr) {
        console.error('MongoDB error in export:', mongoErr);
        // Fall back to SQLite
        subscribers = db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all();
      }
    } else {
      // Just use SQLite if MongoDB isn't connected
      subscribers = db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC').all();
    }
    
    // Create CSV header
    let csv = 'Email,SessionID,Source,CreatedAt\n';
    
    // Add each subscriber to CSV
    subscribers.forEach(s => {
      // Clean up values to avoid CSV issues (basic escaping)
      const email = s.email ? s.email.replace(/"/g, '""') : '';
      const sessionId = s.session_id || s.sessionId || '';
      const subSource = s.source || '';
      const createdAt = s.created_at || '';
      
      csv += `"${email}","${sessionId}","${subSource}","${createdAt}"\n`;
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=marketmirror-subscribers-${Date.now()}.csv`);
    
    // Send the CSV data
    return res.send(csv);
  } catch (err) {
    console.error('Error exporting subscribers:', err);
    return res.status(500).json({ error: 'Failed to export subscribers' });
  }
});

// Start the server
// Connect to MongoDB before starting the server
connectToMongoDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  console.log('Server will continue with SQLite only');
});

app.listen(port, () => {
  console.log(`MarketMirror API running on port ${port}`);
  console.log(`API key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`Caching: ${ENABLE_CACHING ? 'enabled' : 'disabled'}`);
  console.log(`MongoDB: ${subscribersCollection ? 'connected' : 'not connected (using SQLite only)'}`);
});