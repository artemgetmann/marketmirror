# Security Policy

## Supported Versions

This project currently supports the latest `main` branch.

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Report privately with:

- clear reproduction steps
- impact assessment
- suggested fix (if you have one)

If this repo is hosted on GitHub, use private vulnerability reporting.

## Security Baseline

- No hardcoded production credentials.
- Admin endpoints require `JWT_SECRET` and `ADMIN_PASSWORD`.
- CORS is allowlist-based via `ALLOWED_ORIGINS`.
- Input validation is enforced for ticker, session ID, and email.
