# scripts/

Utility scripts referenced from the root `package.json` or mounted into containers. All scripts are cross-platform unless noted.

## Reference

| Script | Invoked via | Purpose |
| --- | --- | --- |
| `generate-secrets.mjs` | `npm run secrets:generate` | Print fresh JWT/session/CSRF/encryption secrets to append to `.env`. Pure Node — works on Windows/macOS/Linux without OpenSSL. |
| `validate-env.mjs` | `npm run validate:env` | Check `.env` against the required-variable list and warn on missing/insecure values. |
| `create-new-app.js` | `npm run new-app` | Scaffold a new `app.<name>` package with Vite + React + workspace wiring. |
| `create-new-lib.js` | `npm run new-lib` | Scaffold a new `lib.<name>` package with TypeScript + Jest + workspace wiring. |
| `generate-test-attachments.js` | `npm run generate:attachments` | Generate sample chat attachments (images + PDFs) into `uploads/chat/` for the `20-emily-attachment-test` seeder. |
| `init-postgis.sql` | mounted into `database` container at `/docker-entrypoint-initdb.d/` | Enables the PostGIS extension on first DB init. Runs automatically — do not invoke manually. |

## Adding a new script

1. Drop the file in `scripts/`.
2. Add an entry to root `package.json` `scripts` so it's discoverable via `npm run`.
3. Add a row to the table above.
