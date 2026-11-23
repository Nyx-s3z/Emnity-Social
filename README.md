# Emnity Social — Phase 1

An independent Emnity project. This repository does not modify, import, or depend on your existing Emnity proxy.

## Included

- Open username-based registration and sign-in
- Password hashing with Node.js `crypto.scrypt`
- PostgreSQL user storage
- PostgreSQL-backed login sessions
- HTTP-only session cookies
- Authentication rate limiting
- Display-name editing
- Dark/light theme switcher
- Responsive Discord-inspired dashboard shell

## Requirements

- Node.js 20 or newer
- PostgreSQL

## Run locally

1. Create a PostgreSQL database named `emnity_social`.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to your PostgreSQL connection string.
4. Set `SESSION_SECRET` to a long, random secret (at least 32 characters).
5. Run `npm install`.
6. Run `npm run dev`.
7. Open `http://localhost:3000`.

The app creates the `users` table and PostgreSQL session table automatically on startup.

## Railway deployment

1. Create a **new** GitHub repository named `emnity-social` and upload only these project files.
2. In Railway, create a new project and deploy the GitHub repository as a service.
3. Add a PostgreSQL database to that Railway project.
4. In the web service's Variables, set:
   - `DATABASE_URL` to the PostgreSQL service's connection URL/reference. Use Railway's variable reference UI to select the database URL; do not paste database credentials into source files.
   - `SESSION_SECRET` to a long random secret.
   - `NODE_ENV` to `production`.
   - `COOKIE_SECURE` to `true` once the public site uses HTTPS (Railway domains normally use HTTPS).
5. Set the service start command to `npm start` if Railway does not detect it automatically.
6. Generate a public domain for the web service.

Do not set `DATABASE_URL` to a public database address if Railway's private service connection is available. Never commit `.env` or share secrets.

## API routes

- `GET /api/health` — health check
- `GET /api/me` — current signed-in user
- `POST /api/register` — create an account
- `POST /api/login` — sign in
- `POST /api/logout` — sign out
- `PATCH /api/profile` — update display name

## Phase 1 limitations

This is a foundation, not a complete chat service. Servers, invites, channel permissions, direct messages, and live messaging are not implemented yet. Before opening registration to the public, add email verification, account recovery, moderation/reporting tools, stronger abuse controls, backups, and a privacy policy. Collect as little personal information as possible.
