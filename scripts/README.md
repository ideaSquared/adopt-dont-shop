# scripts/

Utility scripts referenced from the root `package.json` or mounted into containers. All scripts are cross-platform unless noted.

## Reference

| Script | Invoked via | Purpose |
| --- | --- | --- |
| `bootstrap.mjs` | `pnpm bootstrap` | One-shot onboarding: checks Node, seeds `.env`, generates secrets, runs `pnpm install --frozen-lockfile`, builds libs, validates env, and installs Playwright browsers. Pass `-- --skip-playwright` to skip the ~200 MB browser download. |
| `generate-secrets.mjs` | `pnpm secrets:generate` | Print fresh JWT/session/CSRF/encryption secrets to append to `.env`. Pure Node — works on Windows/macOS/Linux without OpenSSL. |
| `validate-env.ts` | `pnpm validate:env` | Check `.env` against the required-variable list and warn on missing/insecure values. Uses the shared Zod schema in `@adopt-dont-shop/lib.validation` so the CLI gate and the backend boot validator stay in lockstep. |
| `check-lib-tests.mjs` | `pnpm check:lib-tests` | CI guard: fails when a `lib.*` package ships with zero test files. Allowlist lives inside the script. |
| `create-new-app.js` | `pnpm new-app` | Scaffold a new `app.<name>` package with Vite + React + workspace wiring. |
| `create-new-lib.js` | `pnpm new-lib` | Scaffold a new `lib.<name>` package with TypeScript + Vitest + workspace wiring. |
| `generate-test-attachments.js` | `pnpm generate:attachments` | Generate sample chat attachments (images + PDFs) into `uploads/chat/` for the `20-emily-attachment-test` seeder. |
| `snapshot-postgres.sh` | cron on production host | Daily `pg_dump` of the prod database to S3. See `docs/operations/snapshot-policy.md`. Bash — Linux/macOS only. |
| `snapshot-uploads.sh` | cron on production host | Daily rsync of the `uploads` Docker volume to S3. See `docs/operations/snapshot-policy.md`. Bash — Linux/macOS only. |
| `check-workspace-consistency.mjs` | `pnpm check:workspaces` | Workspace structural-drift guard (ADS-622). Verifies required scripts per `lib.*`/`app.*` package, `vitest.workspace.ts` coverage, `vite.shared.config.ts` `getLibraryAliases()` coverage, absence of nested `pnpm-lock.yaml`, and absence of stale Jest references. Wired into the `workspace-drift` CI job. |
| `check-docs-index.mjs` | `pnpm check:docs-index` | Fails CI when a markdown file under `docs/` is not linked from `docs/README.md` (ADS-716). Allowlists `docs/README.md` itself and `docs/legal/**`. Wired into the `workspace-drift` CI job (ADS-984). |
| `init-postgis.sql` | mounted into `database` container at `/docker-entrypoint-initdb.d/` | Enables the PostGIS extension on first DB init. Runs automatically — do not invoke manually. |

Helpers live in two subdirectories:

- `scripts/lib/` — shared helpers (e.g. `template-engine.mjs`) consumed by the scaffolding scripts.
- `scripts/templates/` — file templates used by `create-new-app.js` / `create-new-lib.js` to scaffold new workspaces.

## Adding a new script

1. Drop the file in `scripts/`.
2. Add an entry to root `package.json` `scripts` so it's discoverable via `pnpm run`.
3. Add a row to the table above.
