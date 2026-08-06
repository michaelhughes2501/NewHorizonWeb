# 08 — Fixed Project Structure

> **Proposed target state, not the current tree.** Every entry marked with `←` describes an intended change from Phases A–D of [07-refactor-plan.md](./07-refactor-plan.md). Only the following changes have already landed in this PR: `.gitignore` POSIX slash fix and deletion of `.github/workflows/npm-publish.yml`. Everything else — npm workspaces at root, moving reference prototypes into `_legacy/reference/`, adding `docs/`, untracking `agent-reports/*.json`, adding tests — is not yet done.

Target (option 2 root — npm workspaces):

```text
NewHorizonWeb/
│
├── package.json                   ← added: workspaces: ["new-horizon-web", "mobile"]
├── package-lock.json              ← existing (now meaningful)
├── README.md
├── CLAUDE.md
├── AGENTS.md
├── SECURITY.md
│
├── .gitignore                     ← POSIX (fixed this pass); + agent-reports/*.json (A6)
│
├── _legacy/
│   ├── reference/                 ← moved from root (A5)
│   │   ├── admin-dashboard.jsx
│   │   ├── mobile-app.jsx
│   │   ├── notification-system.jsx
│   │   ├── database-service.js
│   │   └── database-schema.sql
│   ├── standalone/                ← older attempt (unchanged)
│   └── static-attempt/            ← unchanged
│
├── new-horizon-web/               ← LIVE web app (unchanged)
│   ├── package.json               ← deduplicated devDeps (A3)
│   ├── package-lock.json
│   ├── Dockerfile / Dockerfile.dev / docker-compose.yml
│   ├── server.js
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── ENVIRONMENT.md
│   ├── src/                       ← existing
│   ├── public/                    ← existing
│   ├── supabase/database-schema.sql  ← canonical schema
│   └── test/                      ← added (Phase B)
│
├── mobile/                        ← existing (unchanged this pass)
│   ├── App.js
│   ├── app.json
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   └── assets/
│
├── agent-reports/                 ← gitignored (A6)
│   └── .gitkeep
│
├── buildagent/ depagent/ pragent/ scanner/  ← existing meta-tooling
├── buildagent.yml depagent.yml pragent.yml  ← existing
├── playground/                    ← existing
│
├── docs/
│   ├── DEPLOY.md                  ← added (D2)
│   └── RUNBOOK.md                 ← added
│
└── .github/
    ├── workflows/
    │   ├── ci.yml                 ← existing
    │   ├── codeql.yml             ← existing
    │   ├── dependency-check.yml   ← existing
    │   ├── eslint.yml             ← existing
    │   ├── security-scan.yml      ← existing
    │   ├── build-production.yml   ← existing
    │   └── pr-agent.yml           ← existing
    ├── dependabot.yml             ← existing
    └── instructions/
        └── codacy.instructions.md ← existing (gitignored)
```

## Explicit call-outs

- **`npm-publish.yml`** — deleted this pass; does not appear.
- **Root `.jsx` + `.js` + `.sql` prototypes** — moved into `_legacy/reference/`.
- **`package.json`** at root added (workspaces option).
- **`_legacy/standalone/database-schema.sql`** and other duplicates — consolidated into `_legacy/reference/` or deleted.
- **`agent-reports/*.json`** — not tracked.
