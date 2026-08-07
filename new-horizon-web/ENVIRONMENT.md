# Environment Setup

## Frontend

Use [`.env`](C:/Users/micha/Downloads/files/new-horizon-web/.env) for browser-safe values only.

Allowed here:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never put these in a `VITE_` variable:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- database passwords

## Server / Admin / CLI

Copy [`.env.server.example`](C:/Users/micha/Downloads/files/new-horizon-web/.env.server.example) to `.env.server` and keep it private.

Use `.env.server` for:
- Supabase CLI access
- service-role operations
- edge function deployment
- email provider secrets

## Current Project Split

- Frontend app: [`.env`](C:/Users/micha/Downloads/files/new-horizon-web/.env)
- Server/admin template: [`.env.server.example`](C:/Users/micha/Downloads/files/new-horizon-web/.env.server.example)
