const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

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
  
  console.log(`Analyzing ticker: ${ticker}`);
  
  // Execute MarketMirror.sh with the provided ticker
  exec(`./MarketMirror.sh ${ticker}`, { timeout: 50000 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    
    if (stderr) {
      console.error(`Script stderr: ${stderr}`);
    }
    
    console.log(`Analysis complete for ${ticker}`);
    
    // Return the analysis as JSON
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
});
