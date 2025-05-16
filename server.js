// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Cache setup
const analysisCache = {};
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const ENABLE_CACHING = process.env.ENABLE_CACHING === 'true';

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

// Main endpoint to analyze stocks
app.post('/analyze', (req, res) => {
  console.log('Received request:', req.body);
  
  const { ticker, bypassCache } = req.body;
  
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }
  
  // Check API key before executing script
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }
  
  const tickerUppercase = ticker.toUpperCase();
  const now = Date.now();
  
  // Serve cached analysis if available, valid, and not bypassed
  if (ENABLE_CACHING && !bypassCache && 
      analysisCache[tickerUppercase] && 
      (now - analysisCache[tickerUppercase].timestamp < CACHE_EXPIRY)) {
    console.log(`Serving cached analysis for ${tickerUppercase}`);
    return res.json({ ...analysisCache[tickerUppercase].data, fromCache: true });
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
    
    const responseData = {
      success: true,
      ticker: tickerUppercase,
      analysis: stdout.trim(), // Trim to remove any extra whitespace
      fromCache: false
    };
    
    // Save new analysis in cache if enabled
    if (ENABLE_CACHING) {
      analysisCache[tickerUppercase] = {
        timestamp: now,
        data: responseData
      };
      console.log(`Cached analysis for ${tickerUppercase}`);
    }
    
    return res.json(responseData);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`MarketMirror API running on port ${port}`);
  console.log(`API key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`Caching: ${ENABLE_CACHING ? 'enabled' : 'disabled'}`);
});