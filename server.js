// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Simple in-memory cache for analysis results
const analysisCache = {};
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const ENABLE_CACHING = process.env.ENABLE_CACHING === 'true'; // Controlled by Render env var

// Enable CORS with configuration to allow Lovable domains
app.use(cors({
  origin: ['https://lovable.dev', 'https://marketmirror-clarity-view.lovable.dev', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('MarketMirror API is running');
});

// Cache status endpoint
app.get('/cache-status', (req, res) => {
  return res.json({
    enabled: ENABLE_CACHING,
    cachedTickers: Object.keys(analysisCache),
    tickerCount: Object.keys(analysisCache).length
  });
});

// Main endpoint to analyze stocks
app.post('/analyze', (req, res) => {
  console.log('Received request:', req.body);
  
  const { ticker, bypassCache } = req.body;
  
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }
  
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }
  
  const tickerUppercase = ticker.toUpperCase(); // Normalize ticker case
  const now = Date.now();
  
  // Check cache if enabled and not explicitly bypassed
  if (ENABLE_CACHING && !bypassCache && 
      analysisCache[tickerUppercase] && 
      (now - analysisCache[tickerUppercase].timestamp) < CACHE_EXPIRY) {
    console.log(`Serving cached analysis for ${tickerUppercase}`);
    return res.json(analysisCache[tickerUppercase].data);
  }
  
  console.log(`Analyzing ticker: ${tickerUppercase}`);
  
  // Execute script with sufficient timeout
  exec(`./MarketMirror.sh ${tickerUppercase}`, { 
    timeout: 180000, // 3 minutes
    env: {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    }
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`Analysis complete for ${tickerUppercase}`);
    
    // Prepare response data
    const responseData = {
      success: true,
      ticker: tickerUppercase,
      analysis: stdout,
      fromCache: false
    };
    
    // Store in cache if caching is enabled
    if (ENABLE_CACHING) {
      analysisCache[tickerUppercase] = {
        timestamp: now,
        data: responseData
      };
      console.log(`Cached analysis for ${tickerUppercase}`);
    }
    
    // Return the analysis
    return res.json(responseData);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`MarketMirror API running on port ${port}`);
  console.log(`API key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`Caching enabled: ${ENABLE_CACHING ? 'Yes' : 'No'}`);
});