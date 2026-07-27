# Getting Started — Day 1

A single, linear walkthrough from `git clone` to your first PR-worthy
change. If you only read one doc before writing code, read this one — every
step links to the deeper reference for when you need more than the summary
here.

## 1. Install prerequisites

See the root [README "Prerequisites"](../README.md#prerequisites) section:
Node.js v22 (via `.nvmrc`), pnpm via Corepack, Docker Desktop, Git. Using
GitHub Codespaces or a devcontainer? Skip straight to step 2 — see the
[README "Devcontainer / Codespaces"](../README.md#devcontainer--codespaces-zero-local-setup)
section instead, it does steps 1-2 for you.

## 2. Bootstrap

```bash
git clone https://github.com/ideaSquared/adopt-dont-shop.git
cd adopt-dont-shop
pnpm bootstrap
```

`pnpm bootstrap` enables Corepack, creates `.env` from `.env.example`, generates
fresh JWT/session/encryption secrets into it, and installs every
workspace dependency. It'll also prompt you about the opt-in pre-push hook
(answering yes is recommended for your first month) — see
[CONTRIBUTING.md "Pre-push hook"](../CONTRIBUTING.md#pre-push-hook-ads-732--ads-905)
if you want the details later.

## 3. Boot the stack

```bash
pnpm docker:dev
```

First boot takes a few minutes (image builds + `pnpm install` inside
containers). Subsequent boots are fast. If anything looks stuck or you hit
an error, jump ahead to [step 9 (debugging)](#9-debugging) rather than
guessing.

## 4. Verify it's running

| App | URL |
| --- | --- |
| Client (public adoption portal) | http://localhost:3000 |
| Admin (internal management) | http://localhost:3001 |
| Rescue (rescue org portal) | http://localhost:3002 |
| API gateway health check | http://localhost:4000/health/simple |

All four should respond. If the frontends 502 for the first ~40s after the
containers report "up", that's expected — see the note in
[docs/DOCKER.md](./DOCKER.md) about frontends waiting on the gateway's
health check.

## 5. Run the tests

```bash
pnpm test              # everything, no coverage thresholds
pnpm ci:local:quick     # ~30s: format + lint + type-check (what pre-push runs)
pnpm ci:local           # ~3-5min: the above + test + lib-test guard + workspace drift
```

See [CONTRIBUTING.md "Before opening a PR"](../CONTRIBUTING.md#before-opening-a-pr)
for the full CI-equivalence picture, including the coverage-threshold gate
that plain `pnpm test` skips.

## 6. Tour the repo

Read the root README's
[Project Structure](../README.md#project-structure) section for the
top-level layout (`apps/`, `services/`, `packages/`), then
[docs/dependency-graph.md](./dependency-graph.md) for how the layers
(apps → lib.\* → packages) are allowed to depend on each other and the
generator that visualises it.

## 7. Make your first change

Which docs you need next depends on what you're touching — pick your track
from [docs/README.md "Quick start by role"](./README.md#quick-start-by-role):

- **Frontend** (an `apps/*` page or a `lib.*` component) — start with
  [docs/frontend/technical-architecture.md](./frontend/technical-architecture.md).
- **Backend** (a `services/*` gRPC handler, route, or migration) — start
  with [docs/backend/implementation-guide.md](./backend/implementation-guide.md).
  Writing a migration specifically? Go straight to
  [docs/backend/writing-migrations.md](./backend/writing-migrations.md).
  Adding an entirely new service? See
  [docs/infrastructure/new-microservice.md](./infrastructure/new-microservice.md).
- **A new shared library** — `pnpm new-lib <name>` scaffolds it; see
  [scripts/templates/lib/common/README.md](../scripts/templates/lib/common/README.md).

Whatever you're touching, this repo follows TDD (see
[CONTRIBUTING.md "TDD loop"](../CONTRIBUTING.md#tdd-loop)) — write the
failing test first.

## 8. Open a PR

Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming, commit
conventions, and the pre-PR checklist. The
[PR template](../.github/pull_request_template.md) mirrors the
most-commonly-failed CI checks — fill it in rather than deleting sections.

## 9. Debugging

Something not working? [docs/DOCKER.md "Troubleshooting"](./DOCKER.md#troubleshooting)
covers the common failure modes (out of memory, HMR not picking up
changes, port conflicts, stale build cache, DB connection issues) and the
per-tier `pnpm docker:logs:*` shortcuts for narrowing down which container
is misbehaving. [docs/backend/troubleshooting.md](./backend/troubleshooting.md)
covers backend-specific failure modes.
