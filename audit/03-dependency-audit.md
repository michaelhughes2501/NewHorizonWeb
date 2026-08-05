# 03 — Dependency Audit

## `new-horizon-web/package.json`

### Runtime deps (safe)

- `@supabase/supabase-js ^2.110.8` — current 2.x.
- `express ^5.2.1` — Express 5.
- `react`, `react-dom` `^19.2.8` — current stable.
- `react-router-dom ^7.18.1` — v7.

### Dev deps (with anomalies)

- **Duplicate keys** — see [02-bug-hunt.md#b3](./02-bug-hunt.md):
  - `@eslint/js`: `^9.39.4` AND `^10.0.1`.
  - `@vitejs/plugin-react`: `^6.0.4` AND `^6.0.3`.
  Silent version resolution to the last-parsed line.
- `eslint ^10.8.0` — current.
- `eslint-plugin-react ^7.37.5` — current.
- Tailwind + `@tailwindcss/vite` v4.
- `vite ^8.x` — current.

### Missing

- **No test runner declared** in the visible portion of `package.json` (the file truncated at line ~30 in the audit read).
- **No `vitest`** — matches other siblings; add.
- **No `msw`** — needed for Supabase test mocking.

## Root

**No `package.json` at root.** Only a `package-lock.json` (dangling). Recommend either:
- Delete `package-lock.json` at root.
- Or create a lightweight root `package.json` with `workspaces: ["new-horizon-web", "mobile"]` if the intent is a monorepo.

## Mobile (`mobile/`)

Not audited in this pass. `app.json`, `App.js`, and a real Expo config exist.

## Recommendations

1. Deduplicate `new-horizon-web/package.json` devDeps.
2. Decide root — delete the orphan `package-lock.json` or adopt npm workspaces.
3. Add `vitest` + `@testing-library/react` + `msw`.
4. Verify Dependabot targets `new-horizon-web/`, `mobile/`, and root (once root is decided).
