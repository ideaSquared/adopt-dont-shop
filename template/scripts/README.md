# Scripts

Utility scripts referenced from the root `package.json`.

| Script | Run via | Purpose |
|---|---|---|
| `bootstrap.mjs` | `npm run setup` | First-time setup: Node version check, install, build libs, copy `.env` |
| `generate-secrets.mjs` | `npm run secrets:generate` | Print fresh `JWT_SECRET`, `SESSION_SECRET`, `CSRF_SECRET`, `ENCRYPTION_KEY` lines for `.env` |
| `validate-env.mjs` | `npm run validate:env` | Validate `.env` and source files for required and deprecated variables |
| `create-new-app.js` | `npm run new-app <name>` | Scaffold a new React + Vite app at `app.<name>/` |
| `create-new-lib.js` | `npm run new-lib <name>` | Scaffold a new shared library at `lib.<name>/`. Auto-updates `vite.shared.config.ts` and `Dockerfile.app.optimized` |

## Adding more scripts

Place new scripts in this directory and wire them up via the root `package.json` `scripts` object.

## Convention

- `.mjs` for ESM Node scripts
- `.js` for scripts (Node treats as ESM because root `package.json` has `"type": "module"`)
- Use `process.exit(1)` for failures
- Use ANSI color codes for terminal output; no emoji
