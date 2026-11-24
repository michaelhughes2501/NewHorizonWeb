# Environment Setup

New Horizon runs on Neon: the "New_Horizons" Postgres project for data and
Neon Auth for sign-in. The browser talks only to this app's Express server
(`/api`), which checks the signed-in member on every request.

## Frontend (`.env`)

Copy [`.env.example`](./.env.example) to `.env`. Browser-safe values only:

- `VITE_NEON_AUTH_URL`: the Neon Auth base URL (Neon Console > Auth > Configuration)
- `VITE_API_BASE_URL`: optional, only when the API is on another origin
- `VITE_ADMIN_EMAILS`: hashed admin emails for `/admin`
- `VITE_GOOGLE_OAUTH_CLIENT_ID`: public Google OAuth client id

Never put these in a `VITE_` variable:

- `DATABASE_URL`, `DATABASE_URL_UNPOOLED` or any database password
- `AWS_SECRET_ACCESS_KEY`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `RESEND_API_KEY`

## Server (`.env.server`)

Copy [`.env.server.example`](./.env.server.example) to `.env.server` and keep
it private. `server.js` refuses to start without `DATABASE_URL`,
`NEON_AUTH_BASE_URL` and `NEON_AUTH_JWKS_URL`.

## Running locally

```bash
npm install
npm run dev:api   # Express API on :3000 (reads .env.server)
npm run dev       # Vite on :5173, proxies /api to :3000
npm test          # API tests (no database needed)
```

## Database changes

Schema changes live in `neon/migrations/*.sql` and are applied in order with:

```bash
node --env-file=.env.server scripts/migrate-neon.mjs --dry-run
node --env-file=.env.server scripts/migrate-neon.mjs
```

Try them on a Neon branch first.
