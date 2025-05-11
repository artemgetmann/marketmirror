# MarketMirror API

A REST API for analyzing stocks using the MarketMirror script.

## Endpoints

### GET /
Health check endpoint

### POST /analyze
Analyzes a stock based on the provided ticker symbol.

#### Request body
```json
{
  "ticker": "AAPL"
}

Response
{
  "success": true,
  "ticker": "AAPL",
  "analysis": "... detailed stock analysis ..."
}
