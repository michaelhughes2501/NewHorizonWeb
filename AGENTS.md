# AGENTS.md

Guidance for Codex (and humans) when working in this repository.

## Project overview

**NewHorizonWeb** is the web companion to the `new-horizon` mobile app. The runnable app lives under [`new-horizon-web/`](./new-horizon-web): a **Vite + React 18** SPA wired to **Supabase**, with the database schema in `database-schema.sql` and a JS data-access layer in `database-service.js`.

Top-level `.jsx` files are compatibility entry points. The maintained applications
live under `new-horizon-web/` and `mobile/`.

## Tech stack

- Vite 5 + React 18 (`new-horizon-web/`)
- React Router 6
- Supabase (`@supabase/supabase-js`)
- Plain PostgreSQL schema (`database-schema.sql`) intended for Supabase

## Commands (run inside `new-horizon-web/`)

```bash
cd new-horizon-web
npm install
npm run dev        # vite dev server
npm run build      # vite build → dist/
npm run preview    # serve the production build
```

## Environment

Copy `new-horizon-web/.env.example` to `new-horizon-web/.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

See `new-horizon-web/ENVIRONMENT.md` for the full list. Server-only secrets belong in `.env.server.example` and must never be exposed with the `VITE_` prefix.

## Repo layout

- `new-horizon-web/` — the actual Vite SPA (open this in VS Code).
- `new-horizon-web/src/` — components, pages, hooks.
- `new-horizon-web/supabase/` — Supabase project config / migrations.
- `database-schema.sql` — canonical PostgreSQL schema.
- `database-service.js` — thin data-access wrapper.
- `admin-dashboard.jsx` and `mobile-app.jsx` — compatibility exports; use the maintained app paths for new code.

## Conventions

- All DB access goes through Supabase + RLS — never embed a service key on the client.
- Only `VITE_*` env vars are exposed to the browser bundle.
- Use `react-router-dom` v6 patterns (`createBrowserRouter` preferred).
- Use `<img loading="lazy">` and `srcset` for images so pages stay fast.

## VS Code

Open the repo root. Install recommended extensions, then press **F5** to launch the Vite dev server.
