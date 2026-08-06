# 06 — Architecture Review

## Current shape

```text
NewHorizonWeb/                       ← wrapper repo
├── admin-dashboard.jsx              ← REFERENCE prototype (per CLAUDE.md)
├── mobile-app.jsx                   ← REFERENCE prototype (per CLAUDE.md)
├── notification-system.jsx          ← REFERENCE prototype
├── database-service.js              ← REFERENCE prototype
├── database-schema.sql              ← ambiguous vs _legacy/ copy
├── package-lock.json                ← orphan; no root package.json
│
├── new-horizon-web/                 ← the LIVE app (Vite + React 19 + Supabase + Express)
│   ├── server.js                    ← serves the built SPA
│   ├── Dockerfile / Dockerfile.dev / docker-compose.yml
│   ├── src/{App.jsx, main.jsx, components/, pages/, services/, hooks/, lib/}
│   └── supabase/database-schema.sql
│
├── mobile/                          ← React Native + Expo
│   ├── App.js, app.json
│   └── (Expo scaffold)
│
├── _legacy/
│   ├── standalone/                  ← older attempt (duplicates of the root prototypes)
│   └── static-attempt/              ← even older
│
└── buildagent/ depagent/ pragent/ scanner/  ← meta-tooling agents
```

## What works

- **Two-package layout** — web and mobile in one repo. Sensible for a small team.
- **Reference prototypes at root** — documented intent per CLAUDE.md. Uncommon but honest.
- **`_legacy/` organisation** — retains without confusion.
- **Live app is fully self-contained under `new-horizon-web/`** — no imports leak into the root prototypes.

## What strains

### W1 — No root `package.json`

`npm ci` at root fails. Any CI workflow that assumes a root manifest — like the deleted `npm-publish.yml` — falls over.

Two options:
1. **Delete the orphan `package-lock.json`.** No root manifest means "no root workspace"; the intent is clear.
2. **Adopt npm workspaces** — a root `package.json` with `"workspaces": ["new-horizon-web", "mobile"]`. Enables shared devDeps and a single `npm install` at root.

Recommendation: option 2, if there are ever going to be shared devDeps between web and mobile.

### W2 — Root vs `_legacy/standalone/` overlap

Four `.jsx` files at root; the same four files exist under `_legacy/standalone/`. CLAUDE.md says the root ones are reference prototypes — but `_legacy/standalone/` also contains them. This is redundant.

Recommendation: consolidate — move the root reference prototypes into `_legacy/reference/` (or delete them from `_legacy/standalone/` since the root ones are the "current" prototype). Either way, one location.

### W3 — Root `database-schema.sql` and `_legacy/standalone/database-schema.sql` diverge

See [02-bug-hunt.md#l1](./02-bug-hunt.md). Compare and consolidate.

## Meta-agents

Same shape as other portfolio repos. Same follow-ups.

## Verdict

The architecture is sound for its scope (web + mobile + prototypes + legacy). The three consistency fixes above make the tree unambiguous. Nothing structural to change.
