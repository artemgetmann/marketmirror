# Contributing

## Development Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Pull Request Expectations

- Keep changes focused and small.
- Include tests or verification steps in PR description.
- Document behavior changes in `README.md`.
- Do not commit secrets, local DB files, generated analyses, or backup artifacts.

## Code Style

- Use clear names and small functions.
- Add comments for non-obvious logic and edge cases.
- Prefer defensive input validation at request boundaries.
