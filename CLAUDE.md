# CLAUDE.md

Guidance for Claude Code (and other agentic coders) when working in this repo.

## What this is

A two-tree project for the **New Horizon** product:

- `new-horizon-web/` — the Vite + React 18 web app that members and admins
  actually use in a browser.
- Top-level `database-service.js`, `database-schema.sql`,
  `admin-dashboard.jsx`, `mobile-app.jsx`, `notification-system.jsx` — older
  reference snapshots used during prototyping. The **canonical** versions
  live under `new-horizon-web/`. Treat the root files as documentation,
  not as build inputs.

The runtime backend is **Supabase** (Postgres + Auth + Realtime + Edge
Functions). There is no Node server in this repo.

## Stack (new-horizon-web)

- React 18, React Router 6, Vite 5
- `@supabase/supabase-js` for everything (auth, data, realtime, RPC)
- Plain CSS-in-JS / inline styles — no Tailwind, no component library
- Lazy-loaded routes: `/` → `App.jsx`, `/admin` → `AdminDashboard.jsx`,
  `/notifications` → `NotificationCenter.jsx`

## Commands

```bash
cd new-horizon-web
npm install
npm run dev      # vite — opens on the default :5173
npm run build    # vite build → ./dist
npm run preview  # serve the built bundle
```

There is **no lint or typecheck script**. The project is plain JSX
(no TypeScript).

## Environment

`new-horizon-web/.env` (gitignored; see `.env.example`):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=…           # or VITE_SUPABASE_PUBLISHABLE_KEY
```

The service layer reads them via `import.meta.env.VITE_*` — do not use
`process.env.REACT_APP_*` (the old root-level `database-service.js` does,
which is one of the reasons it's a stale reference).

## Where things live

- `new-horizon-web/src/main.jsx` — Router + Suspense + 404.
- `new-horizon-web/src/App.jsx` — main member-facing app (large; pages
  share state through props rather than a global store).
- `new-horizon-web/src/pages/AdminDashboard.jsx`,
  `new-horizon-web/src/pages/NotificationCenter.jsx` — lazy-loaded.
- `new-horizon-web/src/services/database-service.js` — **the** service
  layer. Exports `AuthService`, `ProfileService`, `ConnectionService`,
  `MessageService`, `JobService`, `NotificationService`, `BlogService`,
  `ReportService`, `PresenceService`. Each method is a thin wrapper
  around a Supabase query — read it before adding new ones to keep the
  surface consistent.
- `new-horizon-web/supabase/database-schema.sql` — full schema. Run in
  the Supabase SQL Editor on a new project; safe re-runs require manual
  migrations because the `CREATE TABLE` statements are not idempotent.

## Database conventions

- `profiles.id` (UUID) is the **application** user id; `profiles.auth_id`
  references `auth.users(id)`. Most service helpers accept either via
  `filterProfileByUser(query, userId)` which `OR`s on both columns.
- Counters are maintained by **triggers**, not by client-side RPC calls:
  - `increment_job_apps` (AFTER INSERT on `job_applications`) bumps
    `jobs.applications`. Do **not** also call an `increment` RPC from
    JS — that RPC does not exist and double-counting is the failure mode
    that this branch fixed.
  - `increment_post_likes(post_id UUID)` is an explicit RPC called by
    `BlogService.likePost`. It exists in the schema; keep them in sync.
- RLS is enabled on every user-facing table. New tables should
  `ENABLE ROW LEVEL SECURITY` and have at least one policy, or PostgREST
  will return empty result sets.

## Conventions to follow

- Put all Supabase access in `database-service.js`. Components should
  import a named service (e.g. `JobService.apply(...)`) instead of
  reaching for `supabase` directly.
- Realtime: use the existing `subscribeToConversation` /
  `subscribeToNotifications` pattern and return the channel so callers
  can `unsubscribe` on unmount.
- The root-level `*.jsx` and `database-service.js` files are reference
  copies. If you change behavior, change the file under
  `new-horizon-web/`. Do not edit both.
- Avoid hardcoded production URLs in new code (the `resetPassword`
  redirect to `https://newhorizon.app/reset-password` is one we inherited
  — prefer reading from env if you add similar callbacks).
