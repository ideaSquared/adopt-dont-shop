# Getting Started — Day 1

The ordered Day-1 path from `git clone` to a first PR-worthy change, for a new engineer. It is not the reference: the root [README](../README.md) says what the repo is, how to run it and where things live; this page only tells you what to do next. Every step links to the deeper doc.

## 1. Install prerequisites

See the README's [Prerequisites](../README.md#prerequisites): Node.js v22 (via `.nvmrc`), pnpm via Corepack, Docker Desktop, Git.

Using GitHub Codespaces or the devcontainer? It does steps 1-2 for you (with `--no-start`, so the stack is not running yet) — see [Devcontainer / Codespaces](../README.md#devcontainer--codespaces-zero-local-setup) and continue at step 3.

## 2. Bootstrap

```bash
git clone https://github.com/ideaSquared/adopt-dont-shop.git
cd adopt-dont-shop
pnpm bootstrap
```

What it does, step by step, is in the README's [Setup](../README.md#setup-3-steps). Two prompts matter:

- **Pre-push hook** — answer yes (recommended for your first month). Details: [CONTRIBUTING "Pre-push hook"](../CONTRIBUTING.md#pre-push-hook-ads-732--ads-905).
- **Start the development stack now?** — answer yes and the stack starts detached; skip step 3.

Expected: the run ends with `Setup Complete!` and, if you started the stack, `service.gateway is healthy.` followed by the app URLs.

## 3. Boot the stack

Only if you answered no in step 2 (or used the devcontainer):

```bash
pnpm docker:dev
```

First boot takes a few minutes (image build + `pnpm install` inside containers). Subsequent boots are fast. If anything looks stuck, jump to [step 10](#10-debugging) rather than guessing.

## 4. Verify it's running

| App                             | URL                                 |
| ------------------------------- | ----------------------------------- |
| Client (public adoption portal) | http://localhost:3000               |
| Admin (internal management)     | http://localhost:3001               |
| Rescue (rescue org portal)      | http://localhost:3002               |
| API gateway health check        | http://localhost:4000/health/simple |

All four should respond. The frontends can 502 for ~40 s after the containers report up — they wait on the gateway's health check (see [docs/DOCKER.md](./DOCKER.md)). Nginx on `http://localhost` is not started by `pnpm docker:dev`; it needs `--profile full`.

## 5. Log in with seed data

A fresh stack seeds itself on boot. Log in at http://localhost:3000 as `john.smith@gmail.com` / `DevPassword123!` (adopter), or use the admin / rescue personas from [docs/operations/dev-seed-data.md](./operations/dev-seed-data.md). That page also covers re-seeding (`pnpm db:seed`) and adding synthetic volume (`pnpm db:spam`).

## 6. Run the tests

```bash
pnpm test              # every package, no coverage thresholds
pnpm ci:local:quick    # ~30 s: format + lint + type-check (what the pre-push hook runs)
```

Expected: both exit 0. Before your first push, read [CONTRIBUTING "One-shot preflight"](../CONTRIBUTING.md#one-shot-preflight-recommended-before-pushing) — `pnpm ci:local` runs the full CI-equivalent set, including the coverage thresholds that plain `pnpm test` skips.

## 7. Tour the repo

Read the README's [Project Structure](../README.md#project-structure) for the top-level layout (`apps/`, `services/`, `packages/`), then [docs/dependency-graph.md](./dependency-graph.md) for how the layers (apps → `lib.*` → packages) may depend on each other.

## 8. Make your first change

Pick your track from [docs/README.md "Develop"](./README.md#develop):

- **Frontend** (an `apps/*` page or a `lib.*` component) — start with [docs/frontend/app-shell.md](./frontend/app-shell.md).
- **Backend** (a `services/*` gRPC handler, route, or migration) — start with [docs/backend/implementation-guide.md](./backend/implementation-guide.md). Writing a migration? [docs/backend/writing-migrations.md](./backend/writing-migrations.md). A whole new service? [docs/infrastructure/new-microservice.md](./infrastructure/new-microservice.md).
- **A new shared library** — `pnpm new-lib <name>` scaffolds it; see [scripts/templates/lib/common/README.md](../scripts/templates/lib/common/README.md).

Whatever you touch, this repo follows TDD ([CONTRIBUTING "TDD loop"](../CONTRIBUTING.md#tdd-loop)) — write the failing test first.

## 9. Open a PR

Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for branch naming, Conventional Commits and the pre-PR checklist. The [PR template](../.github/pull_request_template.md) mirrors the most-failed CI checks — fill it in rather than deleting sections. Which CI jobs run, and when to add the `run-e2e` label, is in [.github/workflows/README.md](../.github/workflows/README.md).

## 10. Debugging

[docs/runbooks/dev-stack-troubleshooting.md](./runbooks/dev-stack-troubleshooting.md) covers the dev stack's failure modes (migration failures, NATS races, nginx 502s, stale images, port conflicts, HMR). [docs/DOCKER.md "Troubleshooting"](./DOCKER.md#troubleshooting) has the per-tier `pnpm docker:logs:*` shortcuts, and [docs/backend/troubleshooting.md](./backend/troubleshooting.md) covers backend-specific failures.
