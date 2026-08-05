# 04 — Security Review

Given the live app is a lighter cousin of `new-horizon-platform` (same Supabase backend, same React 19 + Vite 8 stack, likely same convention set), the security posture inherits and simplifies.

## Strengths (inferred + documented)

- **`ENVIRONMENT.md`** — separates client-safe `VITE_*` vars from server-only secrets. Explicit warning against putting service-role keys under `VITE_`.
- **Supabase-backed** — RLS is the enforcement point.
- **Real ESLint pipeline** with `eslint.yml` workflow.
- **`_legacy/` retention** documents what has been intentionally kept vs. what's live — a form of security hygiene (nothing in `_legacy/` is imported by the live app).

## Concerns

### C1 — Root `database-schema.sql` and `_legacy/standalone/database-schema.sql` diverge
See [02-bug-hunt.md#l1](./02-bug-hunt.md). Two files with the same shape but different contents; ambiguous which is canonical. Establish that `new-horizon-web/supabase/database-schema.sql` is the source of truth, and either delete the root ones or move to `_legacy/reference/`.

### C2 — `.env`, `.env.local`, `.env.*.local` all gitignored
Correct.

### C3 — Reference prototypes at root
CLAUDE.md documents `admin-dashboard.jsx`, `mobile-app.jsx`, `notification-system.jsx`, `database-service.js` as prototypes not part of the live build. Anyone auditing the security of this repo needs to know these are prototype files and not enforcement points. Consider moving them under `_legacy/reference/` so the top-level tree is unambiguous.

### C4 — CI coverage
- CodeQL, security-scan (custom), dependency-check, ESLint, pr-agent, build-production, ci — all wired.
- `npm-publish.yml` — deleted this pass.

### C5 — Mobile security
Deferred.

## Summary

Not a vulnerable-app finding; a documentation-clarity finding. Move the reference files into `_legacy/reference/` (or gate them behind a `README.md` in the root explaining what they are).
