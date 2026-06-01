# scripts/

Utility scripts referenced from the root `package.json` or mounted into containers. All scripts are cross-platform unless noted.

## Reference

| Script | Invoked via | Purpose |
| --- | --- | --- |
| `bootstrap.mjs` | `npm run setup` | One-shot onboarding: checks Node, seeds `.env`, generates secrets, runs `npm ci`, builds libs, validates env, and installs Playwright browsers. Pass `-- --skip-playwright` to skip the ~200 MB browser download. |
| `generate-secrets.mjs` | `npm run secrets:generate` | Print fresh JWT/session/CSRF/encryption secrets to append to `.env`. Pure Node — works on Windows/macOS/Linux without OpenSSL. |
| `validate-env.mjs` | `npm run validate:env` | Check `.env` against the required-variable list and warn on missing/insecure values. |
| `check-lib-tests.mjs` | `npm run check:lib-tests` | CI guard: fails when a `lib.*` package ships with zero test files. Allowlist lives inside the script. |
| `create-new-app.js` | `npm run new-app` | Scaffold a new `app.<name>` package with Vite + React + workspace wiring. |
| `create-new-lib.js` | `npm run new-lib` | Scaffold a new `lib.<name>` package with TypeScript + Vitest + workspace wiring. |
| `generate-test-attachments.js` | `npm run generate:attachments` | Generate sample chat attachments (images + PDFs) into `uploads/chat/` for the `20-emily-attachment-test` seeder. |
| `snapshot-postgres.sh` | cron on production host | Daily `pg_dump` of the prod database to S3. See `docs/operations/snapshot-policy.md`. Bash — Linux/macOS only. |
| `snapshot-uploads.sh` | cron on production host | Daily rsync of the `uploads` Docker volume to S3. See `docs/operations/snapshot-policy.md`. Bash — Linux/macOS only. |
| `check-workspace-consistency.mjs` | `npm run check:workspaces` | Workspace structural-drift guard (ADS-622). Verifies required scripts per `lib.*`/`app.*` package, `vitest.workspace.ts` coverage, `vite.shared.config.ts` `getLibraryAliases()` coverage, absence of nested `package-lock.json`, and absence of stale Jest references. Wired into the `workspace-drift` CI job. |
| `check-docs-index.mjs` | invoked from CI / manually | Fails CI when a markdown file under `docs/` is not linked from `docs/README.md` (ADS-716). Allowlists `docs/README.md` itself and `docs/legal/**`. |
| `ratchet-coverage.mjs` | `npm run ratchet:coverage` | Maintenance helper (ADS-717) — reads `service.backend/coverage/coverage-summary.json` and bumps the backend `vitest.config.ts` thresholds upward when actual coverage exceeds them. Never lowers thresholds. |
| `init-postgis.sql` | mounted into `database` container at `/docker-entrypoint-initdb.d/` | Enables the PostGIS extension on first DB init. Runs automatically — do not invoke manually. |

Helpers live in two subdirectories:

- `scripts/lib/` — shared helpers (e.g. `template-engine.mjs`) consumed by the scaffolding scripts.
- `scripts/templates/` — file templates used by `create-new-app.js` / `create-new-lib.js` to scaffold new workspaces.

## Adding a new script

1. Drop the file in `scripts/`.
2. Add an entry to root `package.json` `scripts` so it's discoverable via `npm run`.
3. Add a row to the table above.
