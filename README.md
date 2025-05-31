# MarketMirror API

A REST API for analyzing stocks using the MarketMirror script with rate limiting and email collection capabilities.

## Endpoints

### GET /
Health check endpoint

### GET /cache-status
Returns the current caching status and information about cached tickers

### POST /analyze
Analyzes a stock based on the provided ticker symbol. This endpoint has rate limiting applied (2 analyses per day per user).

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
    "usageLimit": 2,
    "remainingUses": 1
  }
}
```

#### Rate Limit Response (HTTP 429)
```json
{
  "success": false,
  "error": "🔥 You have reached your daily analysis limit. Want more? Join the waitlist.",
  "usageLimit": 2,
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
Allows users to ask follow-up questions about a previously analyzed stock. This endpoint requires a valid sessionId from a prior analysis. The system maintains conversation history for contextual follow-ups.

#### Request body
```json
{
  "question": "What about their dividend yield?",
  "sessionId": "unique-user-session-id",
  "ticker": "AAPL"  // Optional - defaults to the ticker from the original analysis
}
```

#### Success Response
```json
{
  "answer": "... detailed answer to follow-up question ...",
  "sessionId": "unique-user-session-id",
  "ticker": "AAPL",
  "followupInfo": {
    "currentTicker": "AAPL",
    "followupCount": 1,
    "followupLimit": 3,
    "remainingFollowups": 2,
    "allTickers": ["AAPL"],
    "tickerCounts": {
      "AAPL": 1
    },
    "tickerRemaining": {
      "AAPL": 2
    }
  }
}
```

#### Session Expired Response
```json
{
  "error": "Session not found or expired. Please perform a new analysis.",
  "sessionExpired": true
}
```

#### Rate Limit Response
```json
{
  "error": "You have reached the maximum number of follow-up questions for AAPL.",
  "followupLimit": 3,
  "ticker": "AAPL",
  "message": "Please start a new analysis to ask more questions.",
  "availableTickers": ["AAPL", "TSLA"]
}
```

## Session Memory and Follow-ups

MarketMirror's API includes a sophisticated session memory system that enables contextual conversation about stock analyses.

### Key Features

1. **Conversation History**: The system maintains full message history between the initial analysis and follow-up questions, allowing it to reference previous questions and answers.

2. **Follow-up Limits**: Each ticker has a limit of 3 follow-up questions per 24-hour session. This limit is tracked independently for each ticker.

3. **Session Structure**: Each session contains:
   - `messages`: Array of conversation objects with `{role, content}` format
   - `followupCounters`: Tracks the number of follow-ups used per ticker
   - `timestamp`: Used for session expiry tracking

4. **Model Technology**: All follow-up questions are processed using OpenAI's GPT-4.1 model with web search capability for current information.

5. **Session Persistence**: Sessions expire after 24 hours of inactivity, after which a new analysis must be performed.

6. **Self-Reference**: Users can ask questions about previous interactions, such as "What was my last question?" or "What did you say about revenue?"

### Example Conversation Flow

1. User performs initial analysis on ticker "AAPL"
2. User asks follow-up: "What about their dividend yield?"
3. User asks follow-up: "How does it compare to Microsoft?"
4. User asks follow-up: "Summarize our conversation"

The system will maintain context throughout this entire conversation, with each response building on previous context.

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

### Caching Behavior

The API implements caching of stock analyses to reduce API call costs and improve response time. Here's how the caching system works:

1. **Cache Duration**: Each analysis is cached for 24 hours from the time it was created.

2. **In-Memory Storage**: Cached analyses are stored in server memory (not persistent storage). This means all cache is cleared when the server restarts.

3. **User History Tracking**: The system tracks which tickers each user (by session ID) has analyzed, even after they've hit their daily analysis limit.

4. **Accessing Past Analyses**: Users can always access their previously analyzed tickers within the 24-hour window, even after hitting their rate limit. This allows users to reference analyses they've already requested without counting toward their limit.

5. **Individual Expiry**: Each cache entry expires independently 24 hours after creation. The cache items aren't all reset at the same time.

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

The API implements two types of rate limits to control API usage costs:

### Analysis Rate Limiting

Users are limited to 2 stock analyses per day based on their session ID or IP address. This provides a reasonable free tier while controlling API costs.

### Follow-up Question Rate Limiting

Each stock ticker analysis is limited to 3 follow-up questions. This limit is applied per ticker, not per session, so users can ask follow-up questions about any stock they've analyzed without affecting their quota for other tickers.

To ask about a specific ticker, users can include the `ticker` parameter in their follow-up request. If not specified, the system will use the most recently analyzed ticker.

The follow-up response includes information about the remaining questions for all analyzed tickers:

```json
{
  "answer": "... answer to follow-up question ...",
  "followupInfo": {
    "currentTicker": "AAPL",
    "followupCount": 1,
    "followupLimit": 3,
    "remainingFollowups": 2,
    "allTickers": ["AAPL", "TSLA"],
    "tickerCounts": {
      "AAPL": 1,
      "TSLA": 2
    },
    "tickerRemaining": {
      "AAPL": 2,
      "TSLA": 1
    }
  }
}
```

## Analytics Implementation

MarketMirror includes lightweight server-side analytics tracking for key user actions. These events are stored in a MongoDB collection and can be used to generate insights about user behavior.

### Tracked Events

1. **Analysis Submissions**
   - Triggered when a user analyzes a ticker
   - Stored data: `sessionId`, `ticker`, `timestamp`, `userAgent`, `referrer`

2. **Follow-up Questions**
   - Triggered when a user asks a follow-up question
   - Stored data: `sessionId`, `ticker`, `question` (truncated to 100 chars), `timestamp`, `userAgent`, `referrer`

3. **Rate Limit Triggers**
   - Triggered when a user hits either the daily analysis limit or follow-up question limit
   - Stored data: `sessionId`, `limitType` (analysis/followup), `ticker`, `timestamp`, `userAgent`, `referrer`

### MongoDB Integration

All analytics events are stored in the `event_logs` collection in MongoDB (when MongoDB is configured). Event data is also logged to the console with a 📊 prefix for debugging.

### Sample Analytics Queries

```javascript
// Most popular tickers
db.event_logs.aggregate([
  { $match: { event: "analysis_submitted" }},
  { $group: { _id: "$ticker", count: { $sum: 1 } }},
  { $sort: { count: -1 }},
  { $limit: 10 }
])

// Follow-up questions per ticker
db.event_logs.aggregate([
  { $match: { event: "followup_submitted" }},
  { $group: { _id: "$ticker", followupCount: { $sum: 1 } }},
  { $sort: { followupCount: -1 }}
])

// Rate limit analysis
db.event_logs.aggregate([
  { $match: { event: "rate_limit_triggered" }},
  { $group: { 
    _id: "$limitType", 
    count: { $sum: 1 },
    uniqueSessions: { $addToSet: "$sessionId" }
  }}
])
```

## Session Persistence

MarketMirror maintains session state between page refreshes and multiple analyses. Key features:

1. **Follow-up Counter Persistence**: Each ticker maintains its follow-up question count even when:
   - The page is refreshed
   - The same ticker is re-analyzed
   - The user switches between different tickers

2. **Per-Ticker Limits**: Each ticker has its own limit of 3 follow-up questions, properly enforced across sessions.

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
