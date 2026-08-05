# 02 — Bug Hunt

## Confirmed bugs

### B1 — `npm-publish.yml` cannot succeed
- **File:** `.github/workflows/npm-publish.yml`
- **Symptoms:**
  - `uses: actions/checkout@v7` and `actions/setup-node@v7` — **v7 does not exist** for either action (current stable v4 / v5). Job fails at the "Set up action" step every time it runs.
  - `run: npm ci` at repo root — **root has no `package.json`**, only a `package-lock.json`. `npm ci` errors out with `npm ERR! Cannot read properties of null` when there's no manifest.
  - `run: npm publish` — the nested `new-horizon-web/package.json` declares `"private": true`. npm refuses to publish private packages.
- **Fix:** Delete. **Applied in this pass.**

### B2 — `.gitignore` Windows separator
- **File:** `.gitignore`
- **Fix:** POSIX slash. **Applied in this pass.**

### B3 — `new-horizon-web/package.json` has duplicate keys
- **File:** `new-horizon-web/package.json` (`devDependencies` block)
- **Symptom:** `@eslint/js` declared twice (`^9.39.4` on one line, `^10.0.1` on another); `@vitejs/plugin-react` also twice (`^6.0.4`, `^6.0.3`). JSON parsers keep the last value silently — depending on file order, `npm install` resolves the "wrong" version relative to whichever the author intended.
- **Fix:** Deduplicate — keep the newer of each pair (`@eslint/js@^10.0.1`, `@vitejs/plugin-react@^6.0.4`). Not applied — needs a paired `npm install` verification.

## Latent bugs

### L1 — `database-schema.sql` at root differs from `_legacy/standalone/database-schema.sql`
- **Files:** `database-schema.sql`, `_legacy/standalone/database-schema.sql`
- **Symptom:** Two SQL files with the same name and different contents. Someone reading either without context has no way to know which is authoritative. CLAUDE.md says the canonical schema lives under `new-horizon-web/supabase/`.
- **Fix:** Move both root-level `.sql` files into `_legacy/reference/` (matching the reference-prototype pattern for the top-level `.jsx` files). Not applied.

### L2 — `agent-reports/*.json` tracked
Same as siblings.

### L3 — `mobile/` app not audited
Deferred.

## Not-a-bug

- **Top-level `admin-dashboard.jsx`, `mobile-app.jsx`, `notification-system.jsx`, `database-service.js`** — CLAUDE.md explicitly documents these as reference / prototype artefacts. Do not delete.
- **`_legacy/`** — organised retention. Do not delete.

## Nothing else surfaced

The nested app's real source lives under `new-horizon-web/src/` — not audited depth-first here. Should be a follow-up per-sub-app audit if the owner wants it.
