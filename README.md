# MarketMirror

Contrarian AI stock analysis platform with a self-hostable API and React frontend.

Live demo: [https://trymarketmirror.com](https://trymarketmirror.com)

## Repository Structure

- `backend/` Node.js API (analysis, follow-ups, auth, waitlist)
- `frontend/` React + Vite web app

## Local Development

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend default URL: `http://localhost:3000`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev:local
```

Frontend local mode expects backend on `http://localhost:3000`.

## Deploy / Self-Host

- Deploy `backend` with required env vars (`OPENAI_API_KEY`, admin auth vars, CORS allowlist).
- Deploy `frontend` with `VITE_API_URL` pointing at your deployed backend.

See service-specific docs:

- `backend/README.md`
- `frontend/README.md`
