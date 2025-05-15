// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

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

// Main endpoint to analyze stocks
app.post('/analyze', (req, res) => {
  console.log('Received request:', req.body);
  
  const { ticker } = req.body;
  
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }
  
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }
  
  console.log(`Analyzing ticker: ${ticker}`);
  
  // Execute script with sufficient timeout
  exec(`./MarketMirror.sh ${ticker}`, { 
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
    
    console.log(`Analysis complete for ${ticker}`);
    
    // Return the analysis
    return res.json({ 
      success: true,
      ticker: ticker,
      analysis: stdout
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`MarketMirror API running on port ${port}`);
  console.log(`API key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});