# 05 — Production-Readiness Review

## Live app (`new-horizon-web/`)

| # | Requirement | State |
|---|-------------|-------|
| Reproducible install | `package-lock.json` present in `new-horizon-web/`. Duplicate devDep keys need dedup. |
| Env config docs | `ENVIRONMENT.md` — comprehensive. |
| Env config enforcement | Not verified. |
| Tests | Not visible in the audited portion of `package.json`. |
| CI | 6 workflows, all live. |
| Observability | Not verified. |
| Rate limiting | Not verified — Supabase side handles it via RLS. |
| Security headers | Not verified. |
| Deploy | Dockerfile + Dockerfile.dev + docker-compose + `server.js` — real. |
| Migrations | `supabase/database-schema.sql` — inline canonical schema. |
| Runbook | Absent. |

## Root

- No `package.json`. Orphan `package-lock.json`. Reference prototypes.

## Mobile (`mobile/`)

Deferred.

## What's missing

- Testing infrastructure.
- Sentry / crash reporting.
- A `vercel.json` (or the equivalent for whatever the deploy target is) with headers.
- Rate limiting on `server.js` — the Express server that fronts the SPA.

## Verdict

Solid deploy story for a two-package repo. What's needed is a decision on root structure (workspaces yes/no), test wiring, and the two docs (reference prototypes + `_legacy/` organisation).
