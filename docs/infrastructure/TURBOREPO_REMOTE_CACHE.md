# Turborepo Remote Cache Setup

Remote caching lets CI skip rebuilding packages whose source hasn't changed, cutting build times by 30–60% on cached runs.

## How it works

Turbo hashes source files and task inputs. If the hash matches a cached result in the remote store, the output is restored instead of rebuilt.

## Setting up (Vercel Remote Cache — recommended)

1. Install the Turbo CLI locally if you haven't: `npm i -g turbo`
2. Log in: `npx turbo login`
3. Link the repo: `npx turbo link` — this prints your **team slug** and a **token**
4. Add two secrets to the GitHub repo (Settings → Secrets → Actions):
   - `TURBO_TOKEN` — the token from step 3
   - `TURBO_TEAM` — the team slug from step 3

CI will automatically use the cache when these secrets are present. Local builds also benefit after `turbo link`.

## Alternative: self-hosted cache

Use [ducktors/turborepo-remote-cache](https://github.com/ducktors/turborepo-remote-cache) for a self-hosted option compatible with any S3-compatible storage.

Set `TURBO_API` in addition to `TURBO_TOKEN` and `TURBO_TEAM` pointing at your server.

## Verifying it works

After the first warm run, subsequent CI runs on unchanged code should show:
```
>>> FULL TURBO (outputs were already cached)
```
