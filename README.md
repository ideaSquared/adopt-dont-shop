# Adopt Don't Shop — Pet Adoption Platform

A monorepo containing three React frontends, a Node.js/Express backend, and shared libraries for connecting rescue organizations with potential adopters.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v22 — the exact version is pinned in [`.nvmrc`](./.nvmrc) (install via `nvm use`); `package.json` `engines` requires `>=22 <23`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)
- [Git](https://git-scm.com/)

### Setup (3 steps)

```bash
git clone https://github.com/ideaSquared/adopt-dont-shop.git
cd adopt-dont-shop
npm run setup
```

That's it. `npm run setup` is the one-shot bootstrap and it will:
1. Verify Node.js v22
2. Create `.env` from `.env.example` (if missing)
3. **Generate fresh JWT / session / CSRF / encryption secrets straight into `.env`** (won't overwrite existing values)
4. Install all dependencies (`npm ci`)
5. Build shared libraries (required by apps)
6. Run `npm run validate:env` to surface any remaining required values

After it finishes, set `POSTGRES_PASSWORD` and any third-party API keys in `.env`, then start the stack with `npm run docker:dev`.

### Run (Docker — recommended)

```bash
npm run docker:dev          # start full stack in foreground
npm run docker:dev:detach   # or in background
npm run docker:logs         # follow logs
npm run docker:down         # stop
```

### Run (native — no Docker)

You'll need Postgres + Redis running locally. The quickest option is to let Docker run just those two services while the rest of the stack runs natively:

```bash
npm run dev:services        # start Postgres + Redis in Docker (detached)
npm run dev                 # all packages via Turbo
npm run dev:apps            # frontend apps only
npm run dev:backend         # backend only
```

### Access

| App | URL | Purpose |
| --- | --- | --- |
| Client | http://localhost:3000 | Public adoption portal |
| Admin | http://localhost:3001 | Internal management |
| Rescue | http://localhost:3002 | Rescue organization portal |
| Backend API | http://localhost:5000 | REST + WebSocket |
| Nginx proxy | http://localhost | Reverse proxy (subdomains: api, admin, rescue) |

## Project Structure

```
adopt-dont-shop/
├── app.admin/          # Internal management (React + Vite)
├── app.client/         # Public adoption portal (React + Vite)
├── app.rescue/         # Rescue organization portal (React + Vite)
├── service.backend/    # API server (Express + Sequelize + PostgreSQL)
├── lib.*               # Shared libraries (api, auth, chat, components, types, etc.)
├── docker-compose.yml          # Dev stack
├── docker-compose.prod.yml     # Production overlay
├── Dockerfile.app.optimized    # Multi-stage frontend Dockerfile
└── docs/                       # Detailed guides
```

## Common Commands

```bash
# Dev (Docker)
npm run docker:dev               # start
npm run docker:logs              # follow logs
npm run docker:shell:backend     # shell into backend
npm run docker:shell:db          # psql into database
npm run docker:reset             # nuke containers + volumes (DESTROYS data)

# Build / test / quality
npm run build                    # build everything (Turbo handles ordering)
npm run build:libs               # libraries only
npm run build:apps               # apps only
npm run test                     # all tests
npm run lint / lint:fix
npm run type-check
npm run format / format:check

# Database (containers must be running)
npm run db:migrate
npm run db:seed
npm run db:reset                 # migrate + seed

# Production (smoke test)
npm run prod:build
npm run prod:up
npm run prod:down

# Per-package — use Turbo's --filter directly
npx turbo dev --filter=@adopt-dont-shop/lib.api
npx turbo build --filter=@adopt-dont-shop/app.admin
npx turbo test --filter=@adopt-dont-shop/service-backend
```

## Hot Reload

The Docker dev stack is configured for HMR on Windows/macOS/Linux:

- **Frontend apps** — Vite HMR with polling (`CHOKIDAR_USEPOLLING=true`). Edits to `app.*/src/**` and `lib.*/src/**` reload in the browser within ~1-2 seconds.
- **Backend** — `ts-node-dev --poll` restarts on edits to `service.backend/src/**` within ~2 seconds.
- **lib.types** — the `lib-types-watcher` sidecar runs `tsc --watch` and writes to `dist/` continuously; the backend picks up changes automatically via the workspace symlink.
- **Other libraries** (`lib.api`, `lib.auth`, etc.) — Vite aliases point at their `src/` folders, so HMR picks up changes automatically.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, styled-components, React Router, React Query, Socket.io
**Backend:** Node.js 22, Express, TypeScript, Sequelize, PostgreSQL 16 + PostGIS, Redis 7, Socket.io, JWT
**Tooling:** Turborepo, Docker (BuildKit), Nginx, GitHub Actions

## Environment Configuration

Required in `.env` (copy from `.env.example`):

```env
POSTGRES_USER=adopt_user
POSTGRES_PASSWORD=<strong password>
POSTGRES_DB=adopt_dont_shop_dev

JWT_SECRET=<auto-generated by npm run setup>
JWT_REFRESH_SECRET=<auto-generated by npm run setup>
SESSION_SECRET=<auto-generated by npm run setup>
CSRF_SECRET=<auto-generated by npm run setup>

VITE_API_BASE_URL=        # empty in Docker (uses Vite proxy)
VITE_WS_BASE_URL=ws://localhost:5000
```

### Rotating secrets

To replace all JWT / session / CSRF / encryption secrets (e.g. after a suspected compromise), run `npm run secrets:generate` and append the output to your `.env`.

CORS origins are defined once in the root `.env` (`CORS_ORIGIN`), covering both direct container access and nginx-proxied subdomains. After changing CORS, restart the backend: `docker compose restart service-backend`.

All API endpoints live under `/api/v1/` (e.g. `/api/v1/auth/login`). Swagger UI: http://localhost:5000/api/docs (or http://api.localhost/api/docs via the nginx proxy).

## Deployment

Deploys are driven by the `Makefile` at the repo root, which dispatches the GitHub Actions workflows.

```bash
make staging               # deploy main to staging (runs immediately)
make prod                  # deploy main to production (requires approval in the GitHub UI)
make rollback env=production sha=abc1234   # roll the named environment back to a specific commit
make history               # list recent commits to pick a rollback target
```

> `make prod` triggers a real production deployment via the `deploy.yml` workflow. Do not confuse it with `npm run prod:up`, which only spins up the production Docker stack locally for a smoke test and does not deploy anywhere.

## Documentation

- [docs/DOCKER.md](./docs/DOCKER.md) — Docker infrastructure deep dive
- [docs/README.md](./docs/README.md) — full documentation index
- [docs/libraries/](./docs/libraries/) — per-library reference
- [service.backend/README.md](./service.backend/README.md) — backend service
- [lib.components/README.md](./lib.components/README.md) — UI components

## Troubleshooting

```bash
npm run docker:logs              # check what's failing
npm run docker:ps                # service status
npm run docker:reset             # nuclear option (wipes DB)
npm run docker:dev:build         # rebuild images from scratch
```

Common issues:

- **Port conflict** — check 3000-3002, 5000, 5432, 6379 are free
- **HMR not firing** — verify `CHOKIDAR_USEPOLLING=true` is set in container env (it is by default in `docker-compose.yml`)
- **Slow builds** — ensure BuildKit is on: `export DOCKER_BUILDKIT=1`

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contributor guide.

## License

MIT — see [LICENSE](./LICENSE).
