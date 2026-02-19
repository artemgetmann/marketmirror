# MarketMirror API

Backend service for MarketMirror stock analysis, follow-up Q&A, and waitlist collection.

Live product demo: [https://trymarketmirror.com](https://trymarketmirror.com)

## Quick Start (Self-Host)

```bash
npm install
cp .env.example .env
npm run dev
```

Default local URL: `http://localhost:3000`

## Environment Variables

Required for real analysis:

- `OPENAI_API_KEY`

Core config:

- `MONGODB_URI` (optional, SQLite fallback is used when unavailable)
- `ENABLE_CACHING=true|false` (default `true`)
- `MOCK_API_CALLS=true|false` (default `false`)
- `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080`

Admin config (required to enable admin endpoints + rate-limit bypass):

- `JWT_SECRET`
- `ADMIN_USERNAME` (default `admin`)
- `ADMIN_PASSWORD`

If `JWT_SECRET` or `ADMIN_PASSWORD` is missing, admin auth is intentionally disabled.

## API Endpoints

### `GET /`

Health check.

### `GET /cache-status`

Returns cache status:

```json
{
  "cachingEnabled": true,
  "cachedTickers": ["AAPL"],
  "totalCached": 1
}
```

### `POST /analyze`

Analyzes a ticker with session-aware rate limiting.

Request:

```json
{
  "ticker": "AAPL",
  "sessionId": "session_1234567890_abcd123",
  "bypassCache": false
}
```

Success:

```json
{
  "success": true,
  "ticker": "AAPL",
  "analysis": "...",
  "sessionId": "session_1234567890_abcd123",
  "fromCache": false,
  "usageInfo": {
    "usageCount": 1,
    "usageLimit": 2,
    "remainingUses": 1
  }
}
```

Rate limit (`429`):

```json
{
  "success": false,
  "error": "🔥 You have reached your daily analysis limit. Want more? Join the waitlist.",
  "usageLimit": 2,
  "resetTime": "2026-02-20T00:00:00.000Z",
  "resetInSeconds": 86400
}
```

### `POST /followup`

Requests follow-up analysis within an active session.

Request:

```json
{
  "question": "How does it compare to MSFT?",
  "sessionId": "session_1234567890_abcd123",
  "ticker": "AAPL"
}
```

Success:

```json
{
  "answer": "...",
  "sessionId": "session_1234567890_abcd123",
  "ticker": "AAPL",
  "followupInfo": {
    "currentTicker": "AAPL",
    "followupCount": 1,
    "followupLimit": 3,
    "remainingFollowups": 2
  }
}
```

### `POST /subscribe`

Stores waitlist email.

Request:

```json
{
  "email": "user@example.com",
  "sessionId": "session_1234567890_abcd123",
  "source": "usage-limit"
}
```

### `POST /admin/login`

Returns JWT for admin routes and admin rate-limit bypass.

Request:

```json
{
  "username": "admin",
  "password": "your-admin-password"
}
```

### `GET /subscriptions` (Admin)

Requires `Authorization: Bearer <jwt>`.

### `GET /admin/export-subscribers` (Admin)

Requires `Authorization: Bearer <jwt>`.
Returns CSV export.

## How To Use Unlimited Mode (Admin Bypass)

For self-hosted or hosted admin access:

1. Ensure deploy has `JWT_SECRET` and `ADMIN_PASSWORD` configured.
2. Login through admin UI or call `POST /admin/login`.
3. Send returned token as `Authorization: Bearer <token>`.
4. `POST /analyze` requests with valid admin token bypass normal analysis limit.

Do not hardcode fallback credentials in code. Keep credentials in env vars only.

## Local Credential Notes

Use `ADMIN_ACCESS.local.md` (gitignored) for personal operator notes.
Template: `ADMIN_ACCESS.local.example.md`.

## Security Highlights

- No hardcoded admin secrets in current runtime.
- Ticker, session ID, email, and follow-up input validation.
- Safer command execution via `execFile` with argument array.
- JSON request size limit (`32kb`).
- CSV export escaping to reduce formula injection risk.
- Explicit CORS allowlist via `ALLOWED_ORIGINS`.

## License

MIT (see `LICENSE`).
