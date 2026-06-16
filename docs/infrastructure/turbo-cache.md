# Turbo remote caching

Turbo caches the output of every task (`build`, `test`, `lint`, `type-check`,
`format`, …) keyed by the task's inputs. A **local** cache lives in `.turbo/` and
short-circuits unchanged work on your machine. A **remote** cache shares those
artifacts across machines (your laptop, teammates, CI), so a clean checkout can
replay a build someone else already ran instead of rebuilding all ~24 packages
from scratch (5–10 min cold vs <30 s warm).

`turbo.json` already sets `remoteCache.enabled: true`; CI authenticates with the
`TURBO_TOKEN` / `TURBO_TEAM` secrets. This guide covers opting in **locally**.

## Quick start (Vercel-hosted cache)

The default remote cache backend is Vercel's (free for the Hobby tier). Link
once per checkout:

```bash
npx turbo login   # opens a browser, authenticates your Vercel account
npx turbo link    # associates this repo with your team's remote cache
pnpm cache:status # confirms the link
```

After linking, `.turbo/config.json` holds your team id. Subsequent `pnpm build`,
`pnpm test`, `pnpm format:check`, etc. read from and write to the shared cache.

`pnpm cache:status` reports whether the cache is linked. For per-run hit rates,
add `--summarize` to any turbo command (e.g. `turbo run build --summarize`) and
read the JSON written to `.turbo/runs/`.

## No Vercel account? (Codespaces, OSS contributors, self-host)

You do **not** need a Vercel account to benefit from caching:

- **Local cache only.** Skip `turbo login` / `turbo link` entirely. The local
  `.turbo/` cache still short-circuits repeated work within your checkout — you
  just don't share artifacts across machines. This is the zero-setup default and
  is fine for most contributors.
- **Self-hosted remote cache.** Turbo speaks a documented HTTP cache protocol,
  so any compatible server works (community options exist, e.g. a small
  S3-backed or Redis-backed cache server). Point Turbo at it with environment
  variables instead of `turbo link`:

  ```bash
  export TURBO_API="https://your-cache-host.example"
  export TURBO_TOKEN="<token issued by your cache server>"
  export TURBO_TEAM="adopt-dont-shop"
  ```

  Put these in your shell profile (never commit them). With `TURBO_API` set,
  Turbo uses your server instead of Vercel's.

## Token rotation

Remote-cache tokens are credentials — treat them like any other secret.

| Token | Where it lives | Rotate when |
| --- | --- | --- |
| Local `turbo login` token | `~/.turbo/config.json` (per-user, machine-local) | On suspected compromise, or when leaving the team. Re-run `npx turbo login`. |
| CI `TURBO_TOKEN` | GitHub Actions repository secret | Quarterly (~90 days), on suspected compromise, or when an admin off-boards. Issue a fresh token from the cache provider, update the `TURBO_TOKEN` secret, delete the old token. |
| Self-hosted `TURBO_TOKEN` | Your shell profile / secrets manager | Same cadence as CI; the cache server should support revoking individual tokens. |

Sensible defaults if you have no stronger policy: rotate CI tokens **every 90
days**, scope each token to the minimum (cache read/write only, no repo or org
scopes), and never reuse a token across environments. Rotating a token only
invalidates authentication — it does **not** invalidate cached artifacts, so
builds keep working after a rotation as long as the new token is in place.

## Troubleshooting

- `pnpm cache:status` says "NOT linked" but you ran `turbo link` — check that
  `.turbo/config.json` exists in the repo root and is not gitignored away.
- Cache misses on a clean checkout that should hit — confirm your Turbo version
  matches CI's (`turbo --version`); cache keys include the Turbo version.
- Want to ignore the cache for one run — pass `--force` (e.g. `turbo run build
  --force`).
