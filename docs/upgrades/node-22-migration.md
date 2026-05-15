# Node 20 → Node 22 LTS Migration Plan

**Linear**: ADS-532
**Status**: Not started — planning only
**Recommended quarter**: Q3 2026 (well before Node 20 EOL in April 2026)

> Node 20 enters end-of-life on **2026-04-30**. Node 22 ("Jod") became Active LTS
> on **2024-10-29** and is supported through **2027-04-30**. We have plenty of
> runway, but we want this in production before Node 20 stops receiving
> security patches.

## 1. Current state

Node 20.19.0 is targeted in three places, all consistent today:

| Location | Value | File |
| --- | --- | --- |
| `engines.node` | `>=20.19.0` | `package.json` |
| `.nvmrc` | `20.19.0` | `.nvmrc` |
| Backend Dockerfile `ARG NODE_VERSION` | `20.19.0` | `service.backend/Dockerfile` (lines 4, 9, 180) |
| App Dockerfile `ARG NODE_VERSION` | `20.19.0` | `Dockerfile.app.optimized` (lines 11–12) |
| GitHub Actions | reads `.nvmrc` via `actions/setup-node@v4` `node-version-file` | `.github/workflows/ci.yml`, `quality.yml`, `lib-test-guard.yml`, `security.yml`, `storybook.yml` |

CI does **not** currently use a matrix — every workflow pulls the single
`.nvmrc` value. Bumping `.nvmrc` will move every job in lockstep, which is
both an advantage (no drift) and a risk (no parallel "test on the new
version" signal before commit).

## 2. Breaking changes / things to watch

References:
- Node.js 21 changelog — <https://nodejs.org/en/blog/release/v21.0.0>
- Node.js 22 changelog — <https://nodejs.org/en/blog/release/v22.0.0>
- Node 22 LTS announcement — <https://nodejs.org/en/blog/release/v22.11.0>

Highlights that may bite us:

| Change | Risk | Notes |
| --- | --- | --- |
| **V8 12.4** — new ICU, regex `v` flag, WebAssembly GC | Low | Most code paths unaffected; watch for stricter regex parsing. |
| **Built-in WebSocket client** | Low | We use `ws`/Socket.IO server-side, not the client; behaviour unchanged. |
| **`require(esm)` (experimental)** | Off by default | Don't enable; keep current CJS/ESM split. |
| **`punycode` deprecation (DEP0040)** runtime warning louder | Medium | `punycode` is pulled in transitively by `tough-cookie`/`whatwg-url`. Our code does not import it directly (`grep -r "punycode" service.backend/src` returns nothing). Likely just a noisy warning until deps update. |
| **`url.parse()` legacy API** still deprecated | None | We do not use it (`grep -r "url.parse(" service.backend/src` returns nothing). |
| **`new Buffer(...)` removed in 22** | None | Already not in use (`grep -r "new Buffer(" service.backend/src` returns nothing). |
| **`fetch`/`Headers`/`Request` stable** | Low | Current code uses axios; future code may switch but nothing forces it. |
| **`--watch` mode default behaviour tweaks** | None | Not used in production, only in scripts. |
| **OpenSSL 3.x stricter defaults** (already in 20) | None | Already vetted on Node 20. |
| **`node:test` runner improvements** | None | We use Vitest. |
| **GLIBC bump** (alpine: needs 3.18+) | Medium | `node:22-alpine` ships on Alpine 3.20; our base image moves with the upstream tag. Verify glibc-linked native deps (`bcrypt`, `pg-native` if added) still link. |

## 3. Risk inventory

Searches that informed the risk assessment (run from repo root):

```bash
grep -rE "punycode|url\.parse\(|new Buffer\(" service.backend/src lib.*/src
grep -rE "from ['\"]node:" service.backend/src lib.*/src    # 0 hits today
grep -rE "process\.binding|domain\.create" service.backend/src   # 0 hits
```

Specific files to re-test post-bump:

- `service.backend/src/index.ts` — server bootstrap; verify graceful shutdown still works on the newer `process` event timing.
- `service.backend/src/services/email*.ts` — `nodemailer` is sensitive to OpenSSL changes; smoke-test sending against the dev SMTP container.
- `service.backend/src/middleware/rate-limiter.ts` — Redis client uses `undici` transitively; spot-check.
- Any lib that calls into `crypto` directly (`grep -rE "from ['\"]crypto['\"]" service.backend/src lib.*/src`).
- All Dockerfiles — `node:22-alpine` musl quirks (notably `bcrypt`).

Native dependencies that re-build per Node major (must rebuild in CI):

- `bcrypt` (transitively used in auth)
- `pg` (pure JS — should be safe but verify)
- Any optional native deps surfaced by `npm rebuild`

## 4. Migration path

**Stage 1 — CI dual-run (no production change):**

1. Add a matrix leg to `.github/workflows/ci.yml` for `node-version: '22.11.0'`
   alongside the existing `.nvmrc` job. Mark it non-blocking initially
   (`continue-on-error: true`).
2. Run for one to two weeks, monitor for failures. Fix any code/test
   incompatibilities surfaced.
3. Promote the Node 22 leg to required.

**Stage 2 — Local + Docker dev bump:**

4. Bump `.nvmrc` to `22.11.0` (or latest 22.x LTS at the time).
5. Bump `engines.node` in root `package.json` to `>=22.11.0`.
6. Bump `ARG NODE_VERSION=22.11.0` in `service.backend/Dockerfile` (two
   FROM stages) and `Dockerfile.app.optimized`.
7. `npm ci` regenerates the lockfile if any optional native binaries change;
   commit the regeneration.

**Stage 3 — Production rollout:**

8. Build production images, deploy to staging, run full integration suite.
9. Watch logs for new deprecation warnings (`DEP0040` etc.) — if any are ours,
   file follow-up tickets, otherwise just track upstream fixes.
10. Promote to production.

**Stage 4 — Cleanup:**

11. Remove the dual-version matrix leg from CI (we are now single-version on 22).
12. Drop `node:20`-related snippets from any docs (e.g. `docs/DOCKER.md`).

## 5. Effort estimate

- Stage 1 (matrix): **0.5 dev-day** to wire up + 1–2 weeks calendar for signal.
- Stage 2 (bump files): **0.5 dev-day**.
- Stage 3 (staging soak + prod rollout): **1 dev-day** plus on-call attention.
- Stage 4 (cleanup): **0.25 dev-day**.

**Total: ~2 dev-days of focused work, spread across ~3 weeks calendar.**

## 6. Test / rollback plan

**Tests:**

- Full CI suite on the matrix leg before bumping `.nvmrc`.
- Backend integration tests against the new Docker image (`docker-compose up`
  and run the seeded smoke flow).
- Manual smoke of all three frontends against the upgraded backend.

**Rollback:**

- The bumps in Stage 2 are localised to four files (`.nvmrc`,
  `package.json`, two Dockerfiles). A revert PR returns us to Node 20.
- If only Docker images break, roll back the deployed image tag without
  touching the repo (we keep prior images).

## 7. Prerequisites

- None for the bump itself.
- Should land **before** Express 5 and React 19 work so that those upgrades
  land on a single Node version (avoids "did the bug appear because of Node
  or because of Express?" debugging).

## 8. Dockerfile changes (concrete)

Two ARG lines, three FROM stages:

```diff
- ARG NODE_VERSION=20.19.0
+ ARG NODE_VERSION=22.11.0
```

Locations:

- `service.backend/Dockerfile:4` (the ARG)
- `service.backend/Dockerfile:9` and `:180` inherit via `${NODE_VERSION}` — no
  edit needed.
- `Dockerfile.app.optimized:11` (the ARG); `:12` inherits.

After bumping, rebuild the optimised image and check `docker run --rm
service.backend:dev node -v` reports `v22.x`.

## 9. CI matrix updates (concrete)

Add (initially non-blocking) before bumping `.nvmrc`:

```yaml
strategy:
  fail-fast: false
  matrix:
    node-version:
      - file:.nvmrc      # current (20.19.0)
      - '22.11.0'        # new
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

Apply to at minimum `ci.yml` (test job) and `quality.yml` (lint/type-check).
After promoting to default, drop the matrix and revert to
`node-version-file: '.nvmrc'`.

## 10. Deprecation warnings to expect

Expect to see one or more of these printed to stderr after the bump (none are
release-blockers, but we should track them):

- **DEP0040** `punycode` — emitted by `tough-cookie`/`whatwg-url` until those
  libs migrate. Track upstream; suppress with `--no-deprecation` only as a
  last resort (not recommended).
- **DEP0166** `Invalid URL escape characters in import specifiers` — fires
  only if a dep ships malformed URLs in package.json `exports`. Should be
  zero hits for us.
- (Was previously a risk only for Jest-based suites opting into
  `--experimental-vm-modules`; every package is on Vitest now, which does
  not require that flag, so this is no longer a concern.)

## 11. Linear follow-up sub-issues to file (titles only)

- `[Deps][Node 22] Add Node 22 leg to GitHub Actions matrix (non-blocking)`
- `[Deps][Node 22] Bump .nvmrc + package.json engines + Dockerfile ARGs`
- `[Deps][Node 22] Soak Node 22 in staging for 1 week + sign-off`
- `[Deps][Node 22] Remove Node 20 matrix leg + update docs/DOCKER.md`
- `[Deps][Node 22] Investigate any new deprecation warnings observed in prod logs`
