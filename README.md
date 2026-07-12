# Secure Auth System

The most secure auth flow 2026. Secure Auth System is a full-stack authentication platform built for modern account security, multi-factor authentication, session control, admin visibility, and abuse prevention.

Live app: https://secure-auth-system.tech

## Overview

This project implements a production-style authentication flow with a React frontend, an Express/TypeScript backend, MySQL persistence through Sequelize, cookie-based JWT sessions, OAuth login, and layered account protection.

The application is served from one backend process:

- API: `/api`
- Swagger docs: `/api/docs`
- OpenAPI JSON: `/api/docs.json`
- Frontend build: `/front`
- Health check: `/api/health`

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express 5, TypeScript
- Database: MySQL with Sequelize
- Auth: JWT access and refresh tokens in HTTP cookies
- MFA: TOTP, email codes, SMS codes, recovery codes
- SSO: Google OAuth and GitHub OAuth
- Security tooling: hCaptcha, rate limiting, audit logs, security alerts
- API docs: Swagger UI and OpenAPI 3

## Security Features

- Secure registration with full-name, username, email, password, and phone validation
- Password hashing with bcrypt
- Strong password rules requiring uppercase, lowercase, number, and special character
- Email validation with format, TLD, MX record, and disposable-domain checks
- International mobile phone validation
- Email verification before account access
- Login by username or email
- Google and GitHub SSO with profile-completion flow
- Required 2FA setup after authentication
- TOTP authenticator app support with QR code setup
- Email-based 2FA
- SMS-based 2FA through Infobip-compatible configuration
- Recovery codes for account access backup
- Trusted devices with revocation
- Active session list with session revocation
- Access-token refresh flow
- Logout with refresh-token revocation and cookie clearing
- Password reset flow with token validation
- Authenticated password change flow
- hCaptcha after suspicious failed login or reset attempts
- Global and route-specific rate limits
- Admin-only dashboard endpoints
- User block and unblock controls
- Reserved username management
- Audit log viewing
- Security alert thresholds for credential stuffing, brute force, coordinated abuse, and privilege escalation

## Application Flow

1. Register with full name, username, email, password, and phone number.
2. Verify email through the email verification link.
3. Log in with username/email and password, or continue with Google/GitHub.
4. Complete profile details for new SSO users.
5. Set up at least one 2FA method.
6. Verify with TOTP, email code, SMS code, or recovery code.
7. Manage account security from the dashboard: 2FA methods, recovery codes, trusted devices, sessions, and password changes.
8. Admin users can access user management, audit logs, and reserved username management.

## Project Structure

```text
.
|-- backend
|   `-- src
|       |-- config
|       |-- docs
|       |-- middlewares
|       |-- modules
|       |   |-- admin
|       |   |-- auth
|       |   |-- users
|       |   `-- verifications
|       |-- services
|       |-- scripts
|       `-- utils
|-- frontend
|   `-- src
|       |-- components
|       |-- hooks
|       |-- pages
|       |-- services
|       |-- styles
|       |-- types
|       `-- utils
|-- .env.example
|-- package.json
`-- README.md
```

## Environment

Copy `.env.example` to `.env` and fill in the required values.

Main configuration groups:

- General app settings: `PORT`, `NODE_ENV`, `BACKEND_PUBLIC_BASE_URL`
- Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- SMTP email delivery: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- SMS delivery: `TEXT_MESSAGE_API_KEY`, `TEXT_MESSAGE_BASE_URL`, `INFOBIP_SMS_PATH`, `INFOBIP_SENDER`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- GitHub OAuth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`
- hCaptcha: `HCAPTCHA_SERVER_SECRET`, `HCAPTCHA_SITE_KEY`, `VITE_HCAPTCHA_SITE_KEY`
- JWT secrets and TTLs: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
- Cookie settings: `AUTH_COOKIE_*`, `REFRESH_COOKIE_*`
- Rate limits and security alert thresholds

Never commit `.env`.

## Local Development

Requirements:

- Node.js `>=20.19.0`
- MySQL database
- npm

Install dependencies:

```bash
npm install
```

Run the app in development mode:

```bash
npm run dev
```

Build both frontend and backend:

```bash
npm run build
```

Start the compiled backend:

```bash
npm start
```

Lint the frontend:

```bash
npm run lint
```

## Backend Scripts

Run backend utility scripts from the repository root with `npm --prefix backend run <script>`.

Available scripts include:

- `dev` - start backend with nodemon and ts-node
- `build` - compile TypeScript backend
- `start` - run compiled backend
- `db:clear` - clear database data
- `db:block-user` - block a user
- `db:unblock-user` - unblock a user
- `db:user-role:admin` - promote user to admin
- `db:user-role:user` - set user role to normal user
- `sms:send` - send an SMS
- `sms:demo` - run SMS demo script

## API Documentation

```text
http://localhost:3000/api/docs
```

## Main API Areas

- Auth: registration, login, logout, email verification, refresh tokens
- Password recovery: reset request, token validation, password reset confirmation
- SSO: Google and GitHub login, callbacks, context, profile completion
- 2FA: TOTP, email code, SMS code, recovery code, 2FA disable
- Devices: trusted device list and revocation
- Sessions: active session list and revocation
- Admin: users, blocked state, audit logs, reserved usernames

## Deployment

Production deployment:

```text
https://secure-auth-system.tech
```

The backend exposes the API under `/api` and can serve the built frontend under `/front` when `frontend/dist` exists.
