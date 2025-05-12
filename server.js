// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Check for API key at startup
if (!process.env.CLAUDE_API_KEY) {
  console.warn("Warning: CLAUDE_API_KEY environment variable is not set. API calls may fail.");
}

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
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
  
  // Check API key before executing script
  if (!process.env.CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }
  
  console.log(`Analyzing ticker: ${ticker}`);
  
  // Execute MarketMirror.sh with the provided ticker and pass environment variables
  exec(`./MarketMirror.sh ${ticker}`, { 
    timeout: 50000,
    env: {
      ...process.env,
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY
    }
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    
    if (stderr) {
      console.error(`Script stderr: ${stderr}`);
    }
    
    console.log(`Analysis complete for ${ticker}`);
    
    // Return the analysis as JSON with debug info
    return res.json({ 
      success: true,
      ticker: ticker,
      analysis: stdout,
      stderr: stderr || null,
      apiKeyLength: process.env.CLAUDE_API_KEY ? process.env.CLAUDE_API_KEY.length : 0
    });
  });
});

// API Key check endpoint
app.get('/check-api-key', (req, res) => {
  if (process.env.CLAUDE_API_KEY) {
    // Only show the first few characters for security
    const maskedKey = process.env.CLAUDE_API_KEY.substring(0, 6) + '...' + 
                      process.env.CLAUDE_API_KEY.substring(process.env.CLAUDE_API_KEY.length - 4);
    res.json({ 
      apiKeyConfigured: true, 
      keyPreview: maskedKey,
      keyLength: process.env.CLAUDE_API_KEY.length
    });
  } else {
    res.json({ apiKeyConfigured: false });
  }
});

// JQ check endpoint
app.get('/check-jq', (req, res) => {
  exec('which jq', (error, stdout, stderr) => {
    if (error) {
      return res.json({ jqInstalled: false, error: error.message });
    }
    
    if (stderr) {
      return res.json({ jqInstalled: false, error: stderr });
    }
    
    return res.json({ jqInstalled: true, path: stdout.trim() });
  });
});

// Script permissions check endpoint
app.get('/check-script', (req, res) => {
  exec('ls -la ./MarketMirror.sh', (error, stdout, stderr) => {
    if (error) {
      return res.json({ scriptExists: false, error: error.message });
    }
    
    if (stderr) {
      return res.json({ scriptExists: false, error: stderr });
    }
    
    // Try to make it executable if it isn't already
    exec('chmod +x ./MarketMirror.sh', (chmodError) => {
      if (chmodError) {
        return res.json({ 
          scriptExists: true, 
          details: stdout.trim(),
          executable: false,
          chmodError: chmodError.message
        });
      }
      
      return res.json({ 
        scriptExists: true, 
        details: stdout.trim(),
        executable: true
      });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

// Start the server
app.listen(port, () => {
  console.log(`MarketMirror API running on port ${port}`);
  console.log(`API key configured: ${process.env.CLAUDE_API_KEY ? 'Yes' : 'No'}`);
});
