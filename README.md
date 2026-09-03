# Adopt Don't Shop — Pet Adoption Platform

This README is the reference: **what** the project is, **how** to run it, and **where** to find things. For a linear, ordered Day-1 path, start at [docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md).

A monorepo containing three React frontends, a Fastify API gateway fronting a fleet of Node.js gRPC microservices, and shared libraries for connecting rescue organizations with potential adopters.

## Quick Start

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/ideaSquared/adopt-dont-shop)

### Devcontainer / Codespaces (zero local setup)

Click the badge above to open the repo in a GitHub Codespace, or in VS Code locally choose **Reopen in Container**. The devcontainer (`.devcontainer/devcontainer.json`) pins Node 22 and ships docker-in-docker so `pnpm docker:dev` works inside the container. Its `postCreateCommand` runs `corepack enable && pnpm bootstrap -- --skip-playwright --no-start --no-enable-prepush` on first launch — so bootstrap sets up `.env` and secrets but the dev stack is **not** started automatically (run `pnpm docker:dev` yourself) and the pre-push hook is left disabled. See [ADS-760](https://linear.app/ideasquared/issue/ADS-760) for the rationale and [`.devcontainer/devcontainer.json`](./.devcontainer/devcontainer.json) for the full config.

For full local control (faster HMR, native Docker performance) follow the prerequisites below.

### Prerequisites

- [Node.js](https://nodejs.org/) v22 — the exact version is pinned in [`.nvmrc`](./.nvmrc) (install via `nvm use`); `package.json` `engines` requires `>=22 <23`
- [pnpm](https://pnpm.io/) — provided via Corepack. `pnpm bootstrap` enables Corepack for you (ADS-894); if you'd rather do it yourself first, run `corepack enable` and the pinned version (`package.json` `"packageManager"`) is used automatically
- Prefer [asdf](https://asdf-vm.com/) or [mise](https://mise.jdx.dev/) instead of nvm/Corepack? The repo also ships a root [`.tool-versions`](./.tool-versions) pinning the same Node and pnpm versions as `.nvmrc` / `package.json` — run `asdf install` or `mise install` and both tools are provisioned automatically
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)
- [Git](https://git-scm.com/)

### Setup (3 steps)

```bash
git clone https://github.com/ideaSquared/adopt-dont-shop.git
cd adopt-dont-shop
pnpm bootstrap
```

That's it. `pnpm bootstrap` is the one-shot bootstrap and it will:

1. Verify Node.js v22
2. Enable Corepack so `pnpm` resolves the pinned version
3. Create `.env` from `.env.example` (if missing)
4. **Generate fresh JWT / session / encryption secrets straight into `.env`** (won't overwrite existing values)
5. Install all dependencies (`pnpm install --frozen-lockfile`)
6. Build shared libraries (required by apps)
7. Run `pnpm validate:env` to surface any remaining required values
8. Install Playwright browsers so `pnpm test:e2e` works out of the box (~200 MB download)
9. Wire up the `.gitmessage` commit template (`git config commit.template .gitmessage`)
10. Offer (interactive prompt, defaults to yes) to enable the opt-in pre-push hook that runs `ci:local:quick` before every push
11. Offer to start the docker dev stack and wait until `service.gateway` reports healthy at `http://localhost:4000/health/simple` (the `dev` profile does not start nginx, so it checks the gateway directly, not `http://localhost`)

Skip the Playwright step with `pnpm bootstrap -- --skip-playwright` if you don't plan to run E2E tests locally; install them later with `pnpm test:e2e:install`.

Pass `--start` to start the stack without prompting, or `--no-start` to skip it. When stdin is **not** a TTY (CI sandboxes, devcontainer postCreate) the prompts fall back to their defaults — the stack **is** started and the pre-push hook is **not** enabled — unless you pass the explicit flags (`--no-start`, `--enable-prepush` / `--no-enable-prepush`). All secrets — including `POSTGRES_PASSWORD` and `REDIS_PASSWORD` — are generated for you; you only need to add any third-party API keys you want in `.env`. If you accepted the start prompt, the stack is already running on the URLs printed above.

### Speed up your builds (Turbo remote cache)

Turbo caches every task (`build`, `test`, `lint`, `type-check`, `format`) so a clean checkout can replay work someone else already ran instead of rebuilding all ~47 buildable packages (5–10 min cold vs <30 s warm). Opt into the **shared** cache once per checkout:

```bash
npx turbo login          # authenticate (opens a browser)
npx turbo link           # link this repo to your team's remote cache
pnpm cache:status        # confirm the link
```

No Vercel account (Codespaces / OSS contributors)? Skip `login`/`link` — the **local** `.turbo/` cache still short-circuits repeated work — or point Turbo at a self-hosted cache. See [docs/infrastructure/turbo-cache.md](./docs/infrastructure/turbo-cache.md) for the no-Vercel path and token-rotation policy.

### Run (Docker — recommended)

```bash
pnpm docker:dev          # start dev stack (apps + services + infra) in foreground
pnpm docker:dev:detach   # or in background
pnpm docker:logs         # follow logs
pnpm docker:down         # stop
```

### Seed dev data

Once the stack is running, load seed data so you can log in and browse:

```bash
pnpm db:seed             # host-side orchestrator: runs each service's db:seed in dependency order
```

Only `auth`, `pets`, `rescue`, `applications` and `chat` have seeders, and they run in that order. The generated accounts share the `SEED_PASSWORD` from `.env` (default `DevPassword123!`). See [docs/operations/dev-seed-data.md](./docs/operations/dev-seed-data.md) for the personas, login details, and the larger `db:spam` volume dataset.

### Run (native — no Docker)

You'll need Postgres + Redis running locally. The quickest option is to let Docker run just those two services while the rest of the stack runs natively. `.env.example` uses the Docker Compose hostnames, so before running natively edit `.env` to point at your host: set `DB_HOST=localhost`, `REDIS_HOST=localhost`, and `REDIS_PORT=6380` (the host port `pnpm dev:services` publishes Redis on).

```bash
pnpm dev:services        # start Postgres + Redis in Docker (detached)
pnpm dev                 # all packages via Turbo (apps + gateway + services)
pnpm dev:apps            # frontend apps only
```

### Access

| App         | URL                   | Purpose                                                                                                                                                                                                        |
| ----------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client      | http://localhost:3000 | Public adoption portal                                                                                                                                                                                         |
| Admin       | http://localhost:3001 | Internal management                                                                                                                                                                                            |
| Rescue      | http://localhost:3002 | Rescue organization portal                                                                                                                                                                                     |
| API gateway | http://localhost:4000 | Fastify REST + WebSocket edge (health: `/health/simple`)                                                                                                                                                       |
| Nginx proxy | http://localhost      | Reverse proxy (subdomains: api, admin, rescue); `/api` + `/socket.io` route to the gateway. **Not started by `pnpm docker:dev`** — it is gated to the `proxy`/`full` profile: `pnpm docker:dev --profile full` |

## Project Structure

```
adopt-dont-shop/
├── apps/                       # React + Vite frontends
│   ├── admin/                  #   internal management
│   ├── client/                 #   public adoption portal
│   └── rescue/                 #   rescue organization portal
├── services/                   # Fastify gateway + gRPC microservices
│   ├── gateway/                #   REST/WS edge (port 4000) — fronts every service
│   ├── auth/           notifications/  pets/         rescue/
│   ├── applications/   chat/           moderation/   matching/
│   └── cms/            audit/          # one Node gRPC service per domain
├── packages/                   # All shared workspace packages
│   ├── proto/ events/ authz/   #   service-only shared packages
│   ├── db/ observability/ storage/ config-secrets/
│   ├── seed-faker/ service-bootstrap/ test-utils/
│   ├── eslint-config-{base,node,react}/
│   └── lib.*                   #   the lib.* packages (see docs/libraries/README.md)
├── docker-compose.yml          # Dev stack (gateway + services + apps under the `full` profile)
├── docker-compose.staging.yml  # Staging (pre-built GHCR images)
├── docker-compose.prod.yml     # Production overlay
├── Dockerfile.service          # Parameterised image for the gateway + services
├── Dockerfile.app              # Multi-stage image that builds a React app (Vite SPA + nginx)
└── docs/                       # Detailed guides
```

## Common Commands

The root `package.json` defines a lot of scripts. `pnpm commands` prints all of
them, grouped by category with a one-line description — the fastest way to
discover a command you don't already know (`pnpm run tasks` / `docs/tasks.md`
has the full command bodies and per-package scripts too).

```bash
# Dev (Docker)
pnpm docker:dev               # start dev stack (gateway + services + apps; add --profile full for observability + nginx)
pnpm docker:logs              # follow logs
pnpm docker:shell:db          # psql into database
pnpm docker:reset             # nuke containers + volumes (DESTROYS data)

# Build / test / quality
pnpm build                    # build everything (Turbo handles ordering)
pnpm build:libs               # libraries only
pnpm build:apps               # apps only
pnpm test                     # all tests
pnpm test:watch               # Vitest watch mode (pass --filter for one package)
pnpm test:changed             # Vitest --changed mode against your git diff
pnpm lint / lint:fix
pnpm type-check
pnpm format / format:check

# Pre-push preflight (run CI-equivalent checks locally)
pnpm ci:local:quick           # fast preflight (~30s): format + lint + type-check
pnpm ci:local                 # full preflight (~3-5min): everything CI runs

# Database — each service migrates its own schema automatically on container
# start (the entrypoint runs `pnpm run --if-present db:migrate`). To migrate a
# single service by hand, exec into its container, e.g.:
pnpm docker:shell:db          # psql into the shared database
docker compose exec service-auth pnpm db:migrate

# Per-package — use Turbo's --filter directly
pnpm exec turbo dev --filter=@adopt-dont-shop/lib.api
pnpm exec turbo build --filter=@adopt-dont-shop/app.admin
pnpm exec turbo test --filter=@adopt-dont-shop/service.gateway
```

> **Schema ownership.** Only the schema-owning services (auth, pets, rescue, applications, chat, notifications, moderation, matching, cms, audit) define and run a `db:migrate` script — each owns its own tables. The gateway owns no tables, so it has no `db:migrate` script; `docker compose exec service-gateway pnpm db:migrate` will fail with a missing-script error, which is expected. Skip it in any per-service migration loop.

## Hot Reload

The Docker dev stack is configured for HMR on Windows/macOS/Linux:

- **Frontend apps** — Vite HMR, native inotify on Linux; polling (`CHOKIDAR_USEPOLLING=true`) on macOS/Windows only, set automatically by `pnpm bootstrap` since [ADS-766](https://linear.app/ideasquared/issue/ADS-766). Edits to `apps/*/src/**` and `packages/lib.*/src/**` reload in the browser within ~1-2 seconds.
- **Gateway + services** — `tsx watch` reloads each on edits to its `services/<name>/src/**` within ~1 second.
- **lib.types** — the `lib-types-watcher` sidecar runs `tsc --watch` and writes to `dist/` continuously; the services pick up changes automatically via the workspace symlink.
- **Other libraries** (`lib.api`, `lib.auth`, etc.) — Vite aliases point at their `src/` folders, so HMR picks up changes automatically.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, vanilla-extract, React Router, React Query, Socket.io
**Backend:** Node.js 22, Fastify (gateway), gRPC microservices, TypeScript, pg + node-pg-migrate, PostgreSQL 16 + PostGIS, Redis 7, NATS JetStream, Socket.io, JWT
**Tooling:** Turborepo, Docker (BuildKit), Nginx, GitHub Actions

## Environment Configuration

Required in `.env` (copy from `.env.example`). `.env.example` only carries
the essentials — every other variable (SMTP/SES, S3, Statsig, Sentry, cron
schedules, and more) is documented, grouped by domain, in
[docs/env-reference.md](./docs/env-reference.md):

```env
POSTGRES_USER=adopt_user
POSTGRES_PASSWORD=<strong password>
POSTGRES_DB=adopt_dont_shop_dev

JWT_SECRET=<auto-generated by pnpm bootstrap>
JWT_REFRESH_SECRET=<auto-generated by pnpm bootstrap>
SESSION_SECRET=<auto-generated by pnpm bootstrap>

VITE_API_BASE_URL=http://localhost:4000
VITE_WS_BASE_URL=ws://localhost:4000
```

### Rotating secrets

To replace all JWT / session / encryption secrets (e.g. after a suspected compromise), run `pnpm secrets:generate` and append the output to your `.env`.

CORS origins are defined once in the root `.env` (`CORS_ORIGIN`), covering both direct container access and nginx-proxied subdomains. After changing CORS, restart the gateway: `docker compose restart service-gateway`.

All API endpoints live under `/api/v1/` (e.g. `/api/v1/auth/login`) and are served by the gateway on port 4000 (or via the nginx proxy at http://api.localhost).

## Deployment

Deploys are driven by the `Makefile` at the repo root. Each `make` target shells out to `gh workflow run …`, which dispatches a GitHub Actions workflow and **returns immediately** — it does not wait for the run to finish. Use `make watch` (or `gh run watch`) to follow it.

> **Deploy prerequisites** — before your first deploy:
>
> - **GitHub CLI installed and authenticated.** Install [`gh`](https://cli.github.com/) and run `gh auth login`. On a fresh Codespace / devcontainer `gh` is pre-installed but **not** authenticated, so an unauthenticated `make staging` silently does nothing useful.
> - **Deploy permission on the repo.** You need write access and membership of the team that's allowed to dispatch the deploy workflows — ask in your team channel if `make staging` reports a permissions error.
> - **For production:** a reviewer with environment-approval rights must click **Approve and deploy** in the GitHub Actions UI before the prod deploy proceeds (the `production` environment is gated on required reviewers).

```bash
make help                  # list every target with a description
make staging               # deploy main to staging (runs immediately)
make prod                  # deploy main to production (requires approval in the GitHub UI)
make watch                 # follow the most recent deploy.yml run in the terminal
make rollback env=production sha=abc1234   # roll the named environment back to a specific commit
make history               # list recent commits to pick a rollback target
```

> `make prod` triggers a real production deployment via the `deploy.yml` workflow. Do not confuse it with `pnpm prod:up`, which only spins up the production Docker stack locally for a smoke test and does not deploy anywhere.

The full operator-side runbook (secret rotation, approval gates, migration recovery) lives in [docs/operations/deploy.md](./docs/operations/deploy.md).

## Documentation

- [docs/DOCKER.md](./docs/DOCKER.md) — Docker infrastructure deep dive
- [docs/infrastructure/new-microservice.md](./docs/infrastructure/new-microservice.md) — runbook for adding a new `services/<name>` backend domain
- [docs/dependency-graph.md](./docs/dependency-graph.md) — Turbo dependency graph generator and layered architecture guide
- [docs/README.md](./docs/README.md) — full documentation index
- [docs/libraries/](./docs/libraries/) — per-library reference
- [services/gateway/README.md](./services/gateway/README.md) — API gateway
- [packages/lib.components/README.md](./packages/lib.components/README.md) — UI components
- [Component library on Storybook](https://ideasquared.github.io/adopt-dont-shop/) — browse the deployed component catalogue (`pnpm --filter @adopt-dont-shop/lib.components storybook` to run it locally on `:6006`, see [packages/lib.components/README.md](./packages/lib.components/README.md#scripts))

## Troubleshooting

```bash
pnpm docker:logs              # check what's failing
pnpm docker:ps                # service status
pnpm docker:reset             # nuclear option (wipes DB)
pnpm docker:dev:build         # rebuild images from scratch
```

Common issues:

- **Port conflict** — check 3000-3002 (apps), 4000 (gateway), 5001-5010 (services), 5432 (Postgres), 6380 (Redis — the dev override remaps the _host_ port off 6379, which Windows frequently reserves; set `REDIS_HOST_PORT` in `.env` to change it), 4222/8222 (NATS) are free
- **HMR not firing** — on macOS/Windows, verify `CHOKIDAR_USEPOLLING=true` is set in container env (`pnpm bootstrap` writes it per-host since [ADS-766](https://linear.app/ideasquared/issue/ADS-766) — it is **not** set on Linux, which uses native inotify instead)
- **Slow builds** — ensure BuildKit is on: `export DOCKER_BUILDKIT=1`

For everything else — migration failures, NATS startup races, nginx 502s, stale dev images, and more — see the [dev stack troubleshooting runbook](./docs/runbooks/dev-stack-troubleshooting.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contributor guide.

## License

MIT — see [LICENSE](./LICENSE).
