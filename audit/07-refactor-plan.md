# 07 — Refactor Plan

## Phase A — Hygiene

### A1. (Done) Delete broken `npm-publish.yml`
Done in this pass.

### A2. (Done) Fix `.gitignore` Windows separator
Done in this pass.

### A3. Deduplicate `new-horizon-web/package.json` devDep keys
Effort: 10 min. `@eslint/js` and `@vitejs/plugin-react` — keep the newer of each pair; re-run `npm install`.

### A4. Decide root layout
- Effort: 30 min.
- Option 1: delete orphan `package-lock.json` at root.
- Option 2: create root `package.json` with `workspaces: ["new-horizon-web", "mobile"]`.

### A5. Consolidate reference prototypes vs `_legacy/standalone/`
- Effort: 20 min.
- Move root `.jsx` prototypes + `database-service.js` + `database-schema.sql` into `_legacy/reference/` (or delete the `_legacy/standalone/` copies).

### A6. Untrack `agent-reports/*.json`
- Effort: 10 min.

## Phase B — Test bar (for `new-horizon-web/`)

### B1. Add vitest + @testing-library/react + msw
Effort: 30 min.

### B2. Write tests for critical hooks + Supabase services
Effort: 4 hrs.

## Phase C — Security + observability

### C1. Wire Sentry (client + Express server)
Effort: 45 min.

### C2. Confirm `server.js` sets rate limits + security headers via `helmet`
Effort: 20 min.

## Phase D — Deploy

### D1. Verify `Dockerfile` builds on CI
Effort: 20 min.

### D2. Document the deploy target in `docs/DEPLOY.md`
Effort: 45 min.

## Phase E — Mobile

### E1. Dedicated audit for `mobile/` (separate Phase-1 pass)
Effort: variable.

## Effort estimate

| Phase | Steps | Effort |
|-------|-------|--------|
| A | 6 | ~1.5 hrs |
| B | 2 | ~4.5 hrs |
| C | 2 | ~1 hr |
| D | 2 | ~1 hr |
| E | 1 | variable |
| **Total** | **13 PRs** | **~8 hrs + mobile** |

## Explicit non-goals

- Merge the mobile and web apps into one codebase.
- Delete the reference prototypes at root — they're documented policy.
