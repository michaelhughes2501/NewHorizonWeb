# 01 — Deep Engineering Audit

## Snapshot

| Dimension | State |
|-----------|-------|
| Live app | `new-horizon-web/` — Vite 8 + React 19 + React Router 7 + `@supabase/supabase-js` + `express` |
| Mobile | `mobile/` — React Native + Expo |
| Deploy | `new-horizon-web/Dockerfile`, `Dockerfile.dev`, `docker-compose.yml`, `server.js` |
| DB | Supabase, schema in `new-horizon-web/supabase/database-schema.sql` |
| Reference prototypes | Top-level `.jsx` + `database-service.js` — intentional (per CLAUDE.md) |
| Legacy | `_legacy/standalone/` + `_legacy/static-attempt/` — retained |
| Docs | `CLAUDE.md`, `AGENTS.md`, `SECURITY.md`, `README.md`, `mobile/CLAUDE.md`, `mobile/AGENTS.md`, `new-horizon-web/ENVIRONMENT.md` |
| CI | 7 workflows — 1 broken (`npm-publish.yml`, deleted this pass) |
| Meta-tooling | Same buildagent / depagent / pragent / scanner pattern |

## What works well

- **Reference vs live is documented.** CLAUDE.md is explicit that the top-level `.jsx` files are prototypes only; the live app is under `new-horizon-web/`. This is a rare and helpful convention.
- **`_legacy/` folder** is an organised retention rather than debris.
- **`ENVIRONMENT.md`** documents client-vs-server env-var split — the same `VITE_` inlining warning as new-horizon-platform.
- **`Dockerfile` + `docker-compose`** for the live app.
- **Real ESLint config** (`new-horizon-web/eslint.config.js`) + `eslint.yml` workflow.
- **`react-router-dom` v7 lazy routes** likely in place (matches sibling patterns).
- **Mobile app + web app in one repo** with separate `AGENTS.md` / `CLAUDE.md` per sub-app.

## Concrete gaps

### G1 — `npm-publish.yml` is unreachable
- Root has no `package.json` → `npm ci` at root fails.
- Nested package is `"private": true` → `npm publish` refuses.
- (Uses `@v7` action tags. As of 2026-08 those versions **do** exist — the original audit note claimed otherwise. That alone would not have blocked the workflow; the two points above did.)

**Deleted in this pass.**

### G2 — `.gitignore` Windows separator
**Fixed in this pass.**

### G3 — `new-horizon-web/package.json` has duplicate keys
`@eslint/js` appears twice (`^9.39.4` and `^10.0.1`), `@vitejs/plugin-react` appears twice (`^6.0.4` and `^6.0.3`). JSON parsers silently keep the last value. Whichever appears later wins on install; the other is a lie that misleads readers. See [02-bug-hunt.md](./02-bug-hunt.md).

### G4 — `database-schema.sql` differs between root and `_legacy/standalone/`
Both files exist; they are not identical. Root is presumably the current reference, but that isn't documented. Establish which is canonical (the migration file is `new-horizon-web/supabase/database-schema.sql` per CLAUDE.md).

### G5 — `agent-reports/*.json` tracked
Same as siblings.

### G6 — `mobile/` app not audited here
Deferred. Should be its own Phase-1 audit at a later time; the audit-report layout applies (same 8 files) but only mobile-specific concerns.

## Verdict

Fewer defects than the average sibling. Main lifts:

1. Delete the broken `npm-publish.yml` (done).
2. De-duplicate the `new-horizon-web/package.json` keys.
3. Document root-vs-live-vs-legacy in the root README (CLAUDE.md already does).
4. Consider absorbing the four reference prototypes into `_legacy/reference/` so root cleanliness matches `_legacy/`'s organised retention.

Nothing structural.
