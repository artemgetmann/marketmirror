// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Import mock responses for testing mode
const { getMockAnalysis, getMockFollowupResponse } = require('./mock-responses');

const express = require('express');
const { execFile } = require('child_process');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const app = express();
const port = process.env.PORT || 3000;

// Cache setup
const analysisCache = {};
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // Environment variables
const ENABLE_CACHING = (process.env.ENABLE_CACHING || 'true').toLowerCase() === 'true';
const API_KEY = process.env.OPENAI_API_KEY || '';

// Test mode configuration - read from environment variable
const MOCK_API_CALLS = (process.env.MOCK_API_CALLS || 'false').toLowerCase() === 'true';

// JWT authentication setup
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_AUTH_ENABLED = Boolean(JWT_SECRET && ADMIN_PASSWORD);
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .concat(['http://localhost:3000', 'http://localhost:8080'])
);
const TICKER_REGEX = /^[A-Z][A-Z0-9.-]{0,9}$/;
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const axios = require('axios');

// Session store for conversation memory
const sessionStore = {};
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours (same as cache)

// Follow-up question limits
const MAX_FOLLOWUPS_PER_TICKER = 3; // Maximum follow-up questions per ticker analysis

// Track user's previously analyzed tickers for cached access
const userAnalysisHistory = {};

function normalizeTicker(input) {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().toUpperCase();
  return TICKER_REGEX.test(normalized) ? normalized : null;
}

function buildIpSessionId(ip) {
  const normalizedIp = String(ip || 'unknown')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 64);
  return `ip_${normalizedIp}`;
}

function normalizeSessionId(candidate, fallbackIp) {
  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (SESSION_ID_REGEX.test(trimmed)) {
      return trimmed;
    }
  }
  return buildIpSessionId(fallbackIp);
}

function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_REGEX.test(email);
}

function escapeCsvField(value) {
  const stringValue = String(value ?? '');
  const protectedValue = /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}



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
let eventLogsCollection = null;

// Analytics event logging function
async function logEvent(eventData) {
  // Add timestamp if not provided
  if (!eventData.timestamp) {
    eventData.timestamp = Date.now();
  }
  
  // Log to console for debugging
  console.log(`📊 Analytics event: ${eventData.event}`, eventData);
  
  // Store in MongoDB if available
  if (MONGODB_ENABLED && eventLogsCollection) {
    try {
      await eventLogsCollection.insertOne(eventData);
    } catch (err) {
      console.error('Failed to log analytics event:', err.message);
    }
  }
}

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
    
    // Get database and collections
    mongoDb = mongoClient.db(); 
    subscribersCollection = mongoDb.collection('subscribers');
    eventLogsCollection = mongoDb.collection('event_logs');
    console.log('MongoDB collections ready');
    
    // Quick test to make sure the connection works
    const subscribersCount = await subscribersCollection.countDocuments({});
    const eventsCount = await eventLogsCollection.countDocuments({});
    console.log(`Found ${subscribersCount} existing subscribers and ${eventsCount} event logs in MongoDB`);
    
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

// Basic hardening headers and explicit CORS allowlist.
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (curl/server-to-server).
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.has(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json({ limit: '32kb' }));

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
  keyGenerator: (req) => normalizeSessionId(
    req.headers['x-session-id'] || req.body.sessionId,
    req.ip
  ),
  handler: (req, res) => {
    // Calculate time until rate limit resets
    const resetTime = new Date(req.rateLimit.resetTime).toISOString();
    const secondsUntilReset = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    
    // Get session ID and user history
    const sessionId = normalizeSessionId(
      req.headers['x-session-id'] || req.body.sessionId,
      req.ip
    );
    const userHistory = Array.from(userAnalysisHistory[sessionId] || []);
    
    // Log rate limit event
    logEvent({
      event: "rate_limit_triggered",
      sessionId: sessionId,
      limitType: "analysis",
      timestamp: Date.now(),
      userAgent: req.headers['user-agent'] || 'unknown',
      referrer: req.headers['referer'] || 'unknown'
    });
    
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
  if (!ADMIN_AUTH_ENABLED) {
    return res.status(503).json({
      success: false,
      error: 'Admin auth is disabled. Set JWT_SECRET and ADMIN_PASSWORD to enable it.'
    });
  }

  const { username, password } = req.body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }
  
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
  
  if (ADMIN_AUTH_ENABLED && authHeader && authHeader.startsWith('Bearer ')) {
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
  const ticker = normalizeTicker(req.body.ticker);
  const sessionId = normalizeSessionId(
    req.headers['x-session-id'] || req.body.sessionId,
    req.ip
  );
  
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
app.post('/analyze', bypassRateLimitForAdmin, async (req, res) => {
  // If admin bypass was used, add info to response
  const adminBypassUsed = req.adminBypass === true;
  const isCachedAnalysis = req.isCachedAnalysis === true;
  
  const { ticker, bypassCache } = req.body;
  
  // Get or create a session ID
  const providedSessionId = req.headers['x-session-id'] || req.body.sessionId;
  const requestIp = req.ip;
  
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }

  const tickerUppercase = normalizeTicker(ticker);
  if (!tickerUppercase) {
    return res.status(400).json({
      error: 'Invalid ticker format. Use 1-10 chars: A-Z, 0-9, dot, or hyphen.'
    });
  }
  
  // Check API key before executing script (only in non-mock mode)
  if (!MOCK_API_CALLS && !API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const now = Date.now();
  
  // Use provided session ID or create a persistent one based on IP
  const sessionId = normalizeSessionId(providedSessionId, requestIp);
  
  // Track this ticker in user's history regardless of cache status
  if (!userAnalysisHistory[sessionId]) {
    userAnalysisHistory[sessionId] = new Set();
  }
  userAnalysisHistory[sessionId].add(tickerUppercase);
  
  // Log analysis submission event
  logEvent({
    event: "analysis_submitted",
    sessionId: sessionId,
    ticker: tickerUppercase,
    timestamp: now,
    userAgent: req.headers['user-agent'] || 'unknown',
    referrer: req.headers['referer'] || 'unknown'
  });
  
  // Serve cached analysis if available, valid, and not bypassed
  if (ENABLE_CACHING && !bypassCache && 
      analysisCache[tickerUppercase] && 
      (now - analysisCache[tickerUppercase].timestamp < CACHE_EXPIRY)) {
    console.log(`Serving cached analysis for ${tickerUppercase}`);
    
    // Save existing follow-up counters if they exist
    const existingCounters = sessionStore[sessionId]?.followupCounters || {};
    
    // Even for cached responses, create a new session (but preserve follow-up counters)
    sessionStore[sessionId] = {
      ticker: tickerUppercase,
      timestamp: now,
      messages: [
        { role: 'system', content: ARTEM_PROMPT },
        { role: 'user', content: `Analyze ${tickerUppercase} stock` },
        { role: 'assistant', content: analysisCache[tickerUppercase].data.analysis }
      ],
      followupCounters: existingCounters // Preserve existing counters
    };
    
    // For debugging
    console.log(`Session created/updated for ${sessionId}, followupCounters:`, existingCounters);
    
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
  
  // In mock mode, return mock responses instead of making real API calls
  if (MOCK_API_CALLS) {
    console.log(`Using mock response for ${tickerUppercase} (MOCK_API_CALLS=true)`);
    
    // Get mock analysis for the ticker
    const mockAnalysis = getMockAnalysis(tickerUppercase);
    
    // Save existing follow-up counters if they exist
    const existingCounters = sessionStore[sessionId]?.followupCounters || {};
    
    // Create a new session with the initial conversation context (but preserve follow-up counters)
    sessionStore[sessionId] = {
      ticker: tickerUppercase,
      timestamp: now,
      messages: [
        { role: 'system', content: ARTEM_PROMPT },
        { role: 'user', content: `Analyze ${tickerUppercase} stock` },
        { role: 'assistant', content: mockAnalysis }
      ],
      followupCounters: existingCounters // Preserve existing counters
    };
    
    // For debugging
    console.log(`Session created/updated for ${sessionId} (mock mode), followupCounters:`, existingCounters);
    
    const userHistory = Array.from(userAnalysisHistory[sessionId] || []);
    
    const responseData = {
      success: true,
      ticker: tickerUppercase,
      analysis: mockAnalysis,
      sessionId: sessionId,
      fromCache: false,
      isCachedAnalysis: isCachedAnalysis,
      testMode: true,
      // Include user's history for frontend use
      analysisHistory: {
        accessibleAnalyses: userHistory,
        count: userHistory.length
      }
    };
    
    // Save mock analysis in cache if enabled
    if (ENABLE_CACHING) {
      analysisCache[tickerUppercase] = {
        timestamp: now,
        data: responseData
      };
      console.log(`Cached mock analysis for ${tickerUppercase}`);
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
        usageLimit: req.rateLimit?.limit || 1,
        remainingUses: req.rateLimit?.remaining || 1
      };
    }
    
    return res.json(responseData);
  }
  
  // If not in mock mode, execute MarketMirror.sh with the provided ticker
  execFile('./MarketMirror.sh', [tickerUppercase], {
    timeout: 180000, // Increased timeout to 180 seconds (3 minutes) for web searches
    env: {
      ...process.env,
      OPENAI_API_KEY: API_KEY
    }
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return res.status(500).json({ error: 'Failed to generate analysis' });
    }
    
    // Log stderr to server logs but don't send to client
    if (stderr) {
      console.log(`Script debug output (stderr): ${stderr}`);
    }
    
    console.log(`Analysis complete for ${tickerUppercase}`);
    
    // Clean the analysis text to remove OpenAI attribution
    const cleanedAnalysis = cleanAnalysisText(stdout.trim());
    
    // Create a new session
    // Save existing follow-up counters if they exist
    const existingCounters = sessionStore[sessionId]?.followupCounters || {};
    
    // Create session for conversation memory (but preserve follow-up counters)
    sessionStore[sessionId] = {
      ticker: tickerUppercase,
      timestamp: now,
      messages: [
        { role: 'system', content: ARTEM_PROMPT },
        { role: 'user', content: `Analyze ${tickerUppercase} stock` },
        { role: 'assistant', content: cleanedAnalysis }
      ],
      followupCounters: existingCounters // Preserve existing counters
    };
    
    // For debugging
    console.log(`Session created/updated for ${sessionId} (real API), followupCounters:`, existingCounters);
    
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
const ARTEM_PROMPT = `MarketMirror AI Prompt — Artem's Philosophy Mode\n\nYou are not a traditional financial analyst. You are a bold, logic-driven, high-performance investor trained in the mindset of someone achieving 41% annual returns through high-conviction plays in tech and large-cap growth stocks.\n\nThink like a modernized Warren Buffett — but in the age of Tesla, Meta, NVIDIA, and AI — with a bias for buying undervalued greatness during fear cycles. Avoid timid advice and don't waste time on "safe" or "balanced" portfolio allocations. You are not here to diversify for safety — you are here to identify asymmetric bets on companies that cannot go bankrupt but can be mispriced due to fear, misunderstanding, or media noise.\n\nFollow these principles:\n1. Buy when fear undervalues great tech companies (e.g., Meta after the Metaverse dip, Tesla during tariff fears).\n2. Ignore short-term noise. Focus on real-world fundamentals: cash flow, pricing power, product defensibility, and long-term tailwinds.\n3. Cash is a position when no high-conviction play is available. Avoid weak "filler" picks.\n4. Prioritize large-cap, liquid assets with long-term upside. This is not a penny stock game.\n5. Speak directly. Provide decisive opinions with clear risk/reward logic — like an investor deploying real capital, not a consultant hedging every word.\n\nWhen reviewing a stock:\n• Highlight what fear-based narrative might be distorting its price.\n• Explain the fundamentals that show long-term strength.\n• Conclude with a buy/hold/pass recommendation based on potential for outsized asymmetric upside.\n\nYour job is to be decisive, bold, and rational — just like Artem Getman`;

// Follow-up endpoint for conversational analysis
app.post('/followup', async (req, res) => {
  // Create variables at the top of the function to ensure they're available everywhere
  let messageHistory = [];
  let ticker = '';
  let userTickers = [];
  const { question, sessionId, ticker: requestedTicker } = req.body;
  
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  if (question.length > 2000) {
    return res.status(400).json({ error: 'Question is too long (max 2000 characters).' });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required. Please provide the sessionId from your analysis request.' });
  }

  if (typeof sessionId !== 'string' || !SESSION_ID_REGEX.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID format.' });
  }

  const normalizedRequestedTicker = requestedTicker ? normalizeTicker(requestedTicker) : null;
  if (requestedTicker && !normalizedRequestedTicker) {
    return res.status(400).json({ error: 'Invalid ticker format for follow-up request.' });
  }
  
  // In non-mock mode, check if API key is configured
  if (!MOCK_API_CALLS && !API_KEY) {
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
  
  // Initialize follow-up counters if not present
  if (!sessionStore[sessionId].followupCounters) {
    sessionStore[sessionId].followupCounters = {};
  }
  
  // Get the ticker from the request or use the default one
  const tickerToUse = normalizedRequestedTicker || sessionStore[sessionId].ticker;
  
  // Log follow-up question event
  logEvent({
    event: "followup_submitted",
    sessionId: sessionId,
    ticker: tickerToUse,
    question: question.substring(0, 100), // Truncate long questions
    timestamp: Date.now(),
    userAgent: req.headers['user-agent'] || 'unknown',
    referrer: req.headers['referer'] || 'unknown'
  });
  
  // Initialize counter for this ticker if not present
  if (sessionStore[sessionId].followupCounters[tickerToUse] === undefined) {
    sessionStore[sessionId].followupCounters[tickerToUse] = 0;
  }

  // Check if user has reached follow-up question limit for this ticker
  if (sessionStore[sessionId].followupCounters[tickerToUse] >= MAX_FOLLOWUPS_PER_TICKER) {
    // Log rate limit event for follow-ups
    logEvent({
      event: "rate_limit_triggered",
      sessionId: sessionId,
      limitType: "followup",
      ticker: tickerToUse,
      timestamp: Date.now(),
      userAgent: req.headers['user-agent'] || 'unknown',
      referrer: req.headers['referer'] || 'unknown'
    });

    return res.status(429).json({
      error: `You have reached the maximum number of follow-up questions for ${tickerToUse}.`,
      followupLimit: MAX_FOLLOWUPS_PER_TICKER,
      ticker: tickerToUse,
      message: 'Please start a new analysis to ask more questions.',
      availableTickers: Array.from(userAnalysisHistory[sessionId] || [])
    });
  }

  try {
    // Check if user has analyzed multiple tickers and wants to specify one
    userTickers = userAnalysisHistory[sessionId] ? Array.from(userAnalysisHistory[sessionId]) : [];
    ticker = sessionStore[sessionId].ticker; // Default to most recent ticker

    // If user requested a specific ticker
    if (normalizedRequestedTicker) {
      // Check if the user has analyzed this ticker
      if (userTickers.includes(normalizedRequestedTicker)) {
        ticker = normalizedRequestedTicker;
        console.log(`User requested to follow up about ${ticker} instead of default ${sessionStore[sessionId].ticker}`);
      } else {
        return res.status(404).json({
          error: `You haven't analyzed ${normalizedRequestedTicker} yet. Please analyze it first.`,
          availableTickers: userTickers
        });
      }
    }
    
    // Get session conversation history for this ticker
    // If using most recent ticker, use current session messages
    if (ticker === sessionStore[sessionId].ticker) {
      messageHistory = [...sessionStore[sessionId].messages];
    } else {
      // Find cached analysis for requested ticker
      if (analysisCache[ticker] && 
          (Date.now() - analysisCache[ticker].timestamp < CACHE_EXPIRY)) {
        // Initialize with original analysis
        messageHistory = [
          { role: 'user', content: `Analyze the stock ticker ${ticker}` },
          { role: 'assistant', content: analysisCache[ticker].data.analysis }
        ];
      } else {
        return res.status(404).json({
          error: `Analysis for ${ticker} has expired. Please analyze it again.`,
          availableTickers: userTickers
        });
      }
    }
    
    // Add the new user question
    messageHistory.push({ role: 'user', content: question });
    
    // If in mock mode, use mock follow-up responses
    if (MOCK_API_CALLS) {
      console.log(`Using mock follow-up response for question about ${ticker} (MOCK_API_CALLS=true)`);
      
      // Get mock response based on the question and ticker
      const mockAnswer = getMockFollowupResponse(question, ticker);
      
      // Update the session with both the question and answer
      messageHistory.push({ role: 'assistant', content: mockAnswer });
      
      // If this is for the current ticker, update the main session messages
      if (ticker === sessionStore[sessionId].ticker) {
        sessionStore[sessionId].messages = messageHistory;
      }
      
      // Refresh session time
      sessionStore[sessionId].timestamp = Date.now();
      
      // Increment follow-up counter for this specific ticker
      sessionStore[sessionId].followupCounters[ticker]++;
      
      // Debug log the counter
      console.log(`Follow-up count for ${ticker}: ${sessionStore[sessionId].followupCounters[ticker]} (session ${sessionId})`);
      
      // For all tickers, keep track of how many follow-ups remain
      const followupCounts = {};
      const remainingFollowups = {};
      
      // Get counts for all analyzed tickers
      userTickers.forEach(t => {
        followupCounts[t] = sessionStore[sessionId].followupCounters[t] || 0;
        remainingFollowups[t] = MAX_FOLLOWUPS_PER_TICKER - followupCounts[t];
      });
      
      return res.json({ 
        answer: mockAnswer,
        sessionId: sessionId,
        ticker: ticker,
        testMode: true,
        followupInfo: {
          // For current ticker
          currentTicker: ticker,
          followupCount: sessionStore[sessionId].followupCounters[ticker],
          followupLimit: MAX_FOLLOWUPS_PER_TICKER,
          remainingFollowups: MAX_FOLLOWUPS_PER_TICKER - sessionStore[sessionId].followupCounters[ticker],
          // For all tickers
          allTickers: userTickers,
          tickerCounts: followupCounts,
          tickerRemaining: remainingFollowups
        },
        usageInfo: {
          usageCount: req.rateLimit?.current || 0,
          usageLimit: req.rateLimit?.limit || 2,
          remainingUses: req.rateLimit?.remaining || 2
        }
      });
    }
    
    // For non-mock mode, proceed with actual API call
    // Create context from previous conversation
    const contextFromHistory = messageHistory.map(msg => {
      if (msg.role === 'system') return msg.content;
      return `${msg.role}: ${msg.content}`;
    }).join('\n\n');
    
    // Make a single API call with the complete context
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
                text: `${contextFromHistory}\n\nuser: ${question}\n\nI want you to respond to this last question based on our conversation history. Use the web to search for the most current information available.`
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
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract the response
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
    
    // If this is for the current ticker, update the main session messages
    if (ticker === sessionStore[sessionId].ticker) {
      sessionStore[sessionId].messages = messageHistory;
    }
    
    // Refresh session time
    sessionStore[sessionId].timestamp = Date.now();
    
    // Increment follow-up counter for this specific ticker
    sessionStore[sessionId].followupCounters[ticker]++;
    
    // Debug log the counter
    console.log(`Follow-up count for ${ticker}: ${sessionStore[sessionId].followupCounters[ticker]} (session ${sessionId})`);
    
    // For all tickers, keep track of how many follow-ups remain
    const followupCounts = {};
    const remainingFollowups = {};
    
    // Get counts for all analyzed tickers
    userTickers.forEach(t => {
      followupCounts[t] = sessionStore[sessionId].followupCounters[t] || 0;
      remainingFollowups[t] = MAX_FOLLOWUPS_PER_TICKER - followupCounts[t];
    });
    
    return res.json({ 
      answer: cleanedAnswer,
      sessionId: sessionId,
      ticker: ticker,
      followupInfo: {
        // For current ticker
        currentTicker: ticker,
        followupCount: sessionStore[sessionId].followupCounters[ticker],
        followupLimit: MAX_FOLLOWUPS_PER_TICKER,
        remainingFollowups: MAX_FOLLOWUPS_PER_TICKER - sessionStore[sessionId].followupCounters[ticker],
        // For all tickers
        allTickers: userTickers,
        tickerCounts: followupCounts,
        tickerRemaining: remainingFollowups
      },
      usageInfo: {
        usageCount: req.rateLimit?.current || 0,
        usageLimit: req.rateLimit?.limit || 2,
        remainingUses: req.rateLimit?.remaining || 2
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

  if (!SESSION_ID_REGEX.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID format' });
  }
  
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
  
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSessionId = sessionId
    ? normalizeSessionId(sessionId, req.ip)
    : null;
  const normalizedSource = typeof source === 'string' ? source.slice(0, 64) : 'usage-limit';
  
  try {
    let alreadyExists = false;
    
    // First, try to store in SQLite (our reliable local database)
    try {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO subscriptions(email, session_id, source) 
         VALUES (?, ?, ?)`
      );
      const result = stmt.run(normalizedEmail, normalizedSessionId, normalizedSource);
      
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
          { email: normalizedEmail },
          { 
            $set: { 
              email: normalizedEmail,
              session_id: normalizedSessionId,
              source: normalizedSource,
              created_at: new Date() 
            } 
          },
          { upsert: true }
        );
        
        console.log(`MongoDB: Email ${normalizedEmail} stored/updated`);
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
  if (!ADMIN_AUTH_ENABLED) {
    return res.status(503).json({
      error: 'Admin auth is disabled. Set JWT_SECRET and ADMIN_PASSWORD to enable it.'
    });
  }

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
      // Escape to prevent CSV injection in spreadsheet tools.
      const email = s.email || '';
      const sessionId = s.session_id || s.sessionId || '';
      const subSource = s.source || '';
      const createdAt = s.created_at || '';
      
      csv += `${escapeCsvField(email)},${escapeCsvField(sessionId)},${escapeCsvField(subSource)},${escapeCsvField(createdAt)}\n`;
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
  console.log(`API key configured: ${API_KEY ? 'Yes' : 'No'}`);
  console.log(`Admin auth: ${ADMIN_AUTH_ENABLED ? 'enabled' : 'disabled (set JWT_SECRET and ADMIN_PASSWORD)'}`);
  console.log(`Allowed CORS origins: ${Array.from(ALLOWED_ORIGINS).join(', ') || 'none'}`);
  console.log(`Caching: ${ENABLE_CACHING ? 'enabled' : 'disabled'}`);
  console.log(`Mock API mode: ${MOCK_API_CALLS ? 'enabled' : 'disabled'}`);
  console.log(`MongoDB: ${subscribersCollection ? 'connected' : 'not connected (using SQLite only)'}`);
});
