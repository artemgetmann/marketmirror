# MarketMirror API

A REST API for analyzing stocks using the MarketMirror script with rate limiting and email collection capabilities.

## Endpoints

### GET /
Health check endpoint

### GET /cache-status
Returns the current caching status and information about cached tickers

### POST /analyze
Analyzes a stock based on the provided ticker symbol. This endpoint has rate limiting applied (1 analysis per day per user).

#### Request body
```json
{
  "ticker": "AAPL",
  "sessionId": "unique-user-session-id",
  "bypassCache": false
}
```

#### Success Response
```json
{
  "success": true,
  "ticker": "AAPL",
  "analysis": "... detailed stock analysis ...",
  "fromCache": true,
  "usageInfo": {
    "usageCount": 1,
    "usageLimit": 1,
    "remainingUses": 0
  }
}
```

#### Rate Limit Response (HTTP 429)
```json
{
  "success": false,
  "error": "🔥 You have reached your daily analysis limit. Want more? Join the waitlist.",
  "usageLimit": 1,
  "resetTime": "2025-05-23T02:39:50.000Z",
  "resetInSeconds": 86400
}
```

### POST /subscribe
Collects user emails when they hit their usage limit.

#### Request body
```json
{
  "email": "user@example.com",
  "sessionId": "unique-user-session-id",
  "source": "usage-limit"
}
```

#### Response
```json
{
  "success": true,
  "message": "👍 You'll be notified when paid plans launch."
}
```

### POST /admin/login
Admin authentication endpoint for obtaining JWT tokens.

#### Request body
```json
{
  "username": "admin",
  "password": "your-secure-password"
}
```

#### Response
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

### GET /subscriptions
Returns all collected email subscriptions. Requires admin authentication.

#### Request Headers
```
Authorization: Bearer [jwt-token]
```

#### Response
```json
{
  "count": 2,
  "subscribers": [
    {
      "id": 1,
      "email": "user@example.com",
      "session_id": "user-session-id",
      "source": "usage-limit",
      "created_at": "2025-05-21 11:04:31"
    },
    // more subscribers...
  ]
}
```

### POST /followup
Allows users to ask follow-up questions about a previously analyzed stock. This endpoint requires a valid sessionId from a prior analysis.

#### Request body
```json
{
  "question": "What about their dividend yield?",
  "sessionId": "unique-user-session-id"
}
```

#### Success Response
```json
{
  "answer": "... detailed answer to follow-up question ...",
  "sessionId": "unique-user-session-id",
  "ticker": "AAPL"
}
```

#### Session Expired Response
```json
{
  "error": "Session not found or expired. Please perform a new analysis.",
  "sessionExpired": true
}
```

## Mock API Mode for Testing

The API includes a testing mode that returns mock responses instead of making real API calls. This is useful for development and testing without consuming OpenAI API credits.

### Configuration

Mock API mode can be enabled/disabled using the environment variable:
```
MOCK_API_CALLS=true/false
```

When enabled:
- All `/analyze` requests will return pre-defined mock analyses
- All `/followup` requests will return realistic mock responses based on question patterns
- No OpenAI API calls will be made
- Rate limiting and caching still function normally
- API key configuration is not required

### Response Format

Mock responses include a `testMode: true` flag to indicate they're from the mock system:

```json
{
  "success": true,
  "ticker": "AAPL",
  "analysis": "... mock stock analysis ...",
  "testMode": true,
  ...
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

## Rate Limiting

The API limits users to 1 stock analysis per day (configurable to 4 in production) based on their session ID or IP address. This helps control API usage costs while providing a reasonable free tier.

## Admin Authentication

The API uses JWT (JSON Web Token) for admin authentication. When authenticated as an admin, you can bypass rate limits and access admin-only endpoints like `/subscriptions`.

### Using Admin JWT Token

To bypass rate limits for development, include the JWT token in the Authorization header:

```http
Authorization: Bearer your-jwt-token
```

### Environment Variables

Admin authentication can be configured with these environment variables:
```
JWT_SECRET=your-secure-jwt-secret
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-admin-password
```
