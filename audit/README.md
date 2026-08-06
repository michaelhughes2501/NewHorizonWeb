# Engineering Audit — NewHorizonWeb

Branch: `claude/engineering-audit-refactor-j2mphk`
Scope: Phase 1 — reports + safe fixes only. Refactor execution deferred.

## Context

`NewHorizonWeb` hosts three things at once:

1. **`new-horizon-web/`** — the real Vite 8 + React 19 + Supabase SPA (also serves via `express` from `server.js`).
2. **`mobile/`** — a React Native + Expo app.
3. **Top-level reference / prototype `.jsx` files** (`admin-dashboard.jsx`, `mobile-app.jsx`, `notification-system.jsx`) — per `CLAUDE.md`, these are documentation-grade prototypes, **not part of the live build**, kept intentionally.
4. **`_legacy/`** — an organised retention folder for older attempts (`standalone/`, `static-attempt/`).

Same meta-agents (`buildagent/`, `depagent/`, `pragent/`, `scanner/`) as the other portfolio repos.

## Reports

| # | File | Focus |
|---|------|-------|
| 1 | [01-deep-engineering-audit.md](./01-deep-engineering-audit.md) | Snapshot |
| 2 | [02-bug-hunt.md](./02-bug-hunt.md) | Concrete defects |
| 3 | [03-dependency-audit.md](./03-dependency-audit.md) | Deps + duplicate-key bug |
| 4 | [04-security-review.md](./04-security-review.md) | Auth, RLS, secrets |
| 5 | [05-production-readiness.md](./05-production-readiness.md) | Deploy, observability |
| 6 | [06-architecture-review.md](./06-architecture-review.md) | Nested-app + legacy retention |
| 7 | [07-refactor-plan.md](./07-refactor-plan.md) | Ordered PRs |
| 8 | [08-fixed-project-structure.md](./08-fixed-project-structure.md) | Target tree |

## Safe fixes applied in this pass

- **`.gitignore`** — replaced `.github\instructions\codacy.instructions.md` (Windows separator) with a POSIX path.
- **`.github/workflows/npm-publish.yml`** — deleted. Two hard-failure reasons it can't succeed:
  1. Root of the repo has no `package.json` (only `package-lock.json`) — `npm ci` at root fails immediately on missing manifest.
  2. The nested `new-horizon-web/package.json` declares `"private": true` — `npm publish` refuses to publish private packages even if the workflow reached that step.
  (The file also uses `actions/checkout@v7` / `actions/setup-node@v7`; those versions **do** exist as of 2026-08 — my earlier note that they didn't was wrong. That alone would not have blocked the workflow. The two points above still do.)

Not touched: `admin-dashboard.jsx`, `mobile-app.jsx`, `notification-system.jsx`, `database-service.js`, `database-schema.sql` at the repo root — CLAUDE.md explicitly documents these as reference / prototype artefacts kept alongside the live app.
