# CLAUDE.md

Guidance for Claude Code (and humans) when working in this repository.

## Project overview

**NewHorizonWeb** is the web companion to the `new-horizon` mobile app. The runnable app lives under [`new-horizon-web/`](./new-horizon-web): a **Vite 6 + React 19** SPA wired to **Supabase**, with the database schema in `database-schema.sql` and a JS data-access layer in `database-service.js`.

Top-level `.jsx` files (`admin-dashboard.jsx`, `mobile-app.jsx`, `notification-system.jsx`) are reference / prototype artefacts — **not part of the live build** and not imported anywhere inside `new-horizon-web/src/`.

## Tech stack

- Vite + React (single-page app under `new-horizon-web/`)
- React Router v6 (declarative routes, lazy-loaded pages)
- Supabase JS (`@supabase/supabase-js`)
- PostgreSQL schema in `database-schema.sql` / `new-horizon-web/supabase/database-schema.sql` — intended for Supabase
- ES modules; Node version requirement and exact package versions are pinned in `new-horizon-web/package.json` — check there if anything below drifts.

## Commands (run inside `new-horizon-web/`)

```bash
cd new-horizon-web
npm install
npm run dev        # vite dev server
npm run build      # vite build → dist/
npm run preview    # serve the production build
```

## Environment

Copy `new-horizon-web/.env.example` to `new-horizon-web/.env` and fill in your Supabase URL + anon key. The canonical lists live in:

- `new-horizon-web/.env.example` — client-safe `VITE_*` vars (Supabase URL, anon key, optional publishable key).
- `new-horizon-web/.env.server.example` — server-only secrets (Supabase service-role/access tokens, DB password, mail API keys, deployment URLs).
- `new-horizon-web/ENVIRONMENT.md` — long-form documentation for every variable.

Server-only secrets must **never** be re-prefixed with `VITE_` — that would inline them into the client bundle and bypass RLS.

## Repo layout

```
NewHorizonWeb/
├── README.md
├── CLAUDE.md                              ← you are here
├── SECURITY.md
├── .github/dependabot.yml                 ← weekly npm + Actions updates (groups: react, vite)
│
├── admin-dashboard.jsx                    ← reference prototype only
├── mobile-app.jsx                         ← reference prototype only (React Native sketch)
├── notification-system.jsx                ← reference prototype only
├── database-service.js                    ← top-level reference copy of the service layer
├── database-schema.sql                    ← top-level reference copy of the schema
├── scripts.js  style.css                  ← doc/landing helpers (not used by Vite app)
│
└── new-horizon-web/                       ← THE ACTUAL VITE SPA — open this in VS Code
    ├── package.json
    ├── vite.config.js                     # minimal: just @vitejs/plugin-react
    ├── index.html
    ├── .env.example  .env.server.example  ENVIRONMENT.md
    ├── src/
    │   ├── main.jsx                       # React Router setup, lazy-loaded pages
    │   ├── App.jsx                        # ~1.5k LOC member app (auth, dashboard, messages, jobs, …)
    │   ├── pages/
    │   │   ├── AdminDashboard.jsx
    │   │   └── NotificationCenter.jsx
    │   └── services/database-service.js   # Supabase wrapper (AuthService, ProfileService, JobService, MessageService, …)
    └── supabase/database-schema.sql       # canonical schema for the live app
```

## Conventions

- **All DB access** goes through Supabase + RLS. Never embed a service-role key on the client.
- Only `VITE_*` env vars are exposed to the browser bundle.
- Use `react-router-dom` v6 patterns. The current implementation in `src/main.jsx` uses `<BrowserRouter>` with declarative `<Routes>` / `<Route>` and lazy-loaded pages — keep that style consistent (don't mix in `createBrowserRouter` ad-hoc).
- Use `<img loading="lazy">` and `srcset` for images so pages stay fast.
- Use the wrappers in `src/services/database-service.js` (Auth/Profile/Job/Message services) rather than calling `supabase` directly from components.
- Mirror schema changes in **both** `database-schema.sql` (top-level reference) **and** `new-horizon-web/supabase/database-schema.sql` (active migration source). Treat the `supabase/` copy as authoritative for the running app. **Note**: as of this writing the two copies are out of sync — the Supabase copy has extra RLS for `blog_likes`/`audit_log`, policies for `blog_likes`/`saved_jobs`, and an `increment_post_likes` function. Reconcile them when you touch the schema.
- The brand uses a gold/cream/charcoal palette with Cormorant Garamond + DM Sans typography (defined inside `App.jsx`); don't introduce a CSS framework on top.
- Treat criminal-history fields as private — store them but never surface them in public API responses.
- The top-level `*.jsx` and `database-service.js` files at the repo root are documentation/prototype only — **don't import them from the Vite app** and don't bring them into bundles.

## CI / automation

`.github/dependabot.yml` keeps dependencies fresh (groups: `react`/`react-dom`/`react-router`, `vite`/`@vitejs/*`) on a weekly cadence; GitHub Actions are also updated weekly. No lint/test/deploy workflows are wired up yet — add them when the project is ready.

## VS Code

Open the repo root. Install recommended extensions, then press **F5** to launch the Vite dev server inside `new-horizon-web/`.
