# MarketMirror API

A REST API for analyzing stocks using the MarketMirror script.

## Endpoints

### GET /
Health check endpoint

### GET /cache-status
Returns the current caching status and information about cached tickers

### POST /analyze
Analyzes a stock based on the provided ticker symbol.

#### Request body
```json
{
  "ticker": "AAPL",
  "bypassCache": false
}
```

Response
```json
{
  "success": true,
  "ticker": "AAPL",
  "analysis": "... detailed stock analysis ...",
  "fromCache": true
}
```

## Caching

The API implements caching of stock analyses for 24 hours to reduce API call costs and improve response time. Cached analyses are stored in memory and served for subsequent requests for the same ticker.

### Configuration

Caching can be enabled/disabled using the environment variable:
```
ENABLE_CACHING=true/false
```

### Bypassing Cache

For testing purposes, you can bypass the cache for specific requests by setting `bypassCache: true` in the request body.

```json
{
  "ticker": "AAPL",
  "bypassCache": true
}
```
