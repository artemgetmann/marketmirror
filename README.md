# MarketMirror Clarity View

Frontend application for MarketMirror.

Live product: [https://trymarketmirror.com](https://trymarketmirror.com)

## Local Setup

```bash
npm install
npm run dev:local
```

## Environment

The app needs:

- `VITE_API_URL`

Defaults in this repo:

- local: `http://localhost:3000` (`npm run dev:local`)
- prod API: `https://marketmirror-api.onrender.com` (`npm run dev:prod`)

## Self-Hosting

1. Deploy the API (`marketmirror-api`) and configure env vars there.
2. Set frontend `VITE_API_URL` to your API URL.
3. Build and deploy frontend:

```bash
npm run build
npm run preview
```

## Scripts

- `npm run dev`
- `npm run dev:local`
- `npm run dev:prod`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Security Notes

- Admin JWT is stored in `localStorage` for browser sessions.
- Avoid exposing secrets in any `VITE_*` variable.
- PDF header rendering avoids direct `innerHTML` interpolation.

## License

MIT (see `LICENSE`).
