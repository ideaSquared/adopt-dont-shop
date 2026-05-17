# TypeScript Monorepo Template

A production-grade TypeScript monorepo scaffold: Turborepo + React (Vite) + Express + shared libraries. Includes Docker dev stack, CI/CD workflows, generator scripts for new apps/libs, and an opinionated testing setup.

## Quick Start

```bash
git clone <your-repo-url>
cd <your-repo-name>
npm install
cp .env.example .env
npm run secrets:generate >> .env
npm run docker:dev
```

Then visit:

- `http://localhost:3000` — `app.web` (React app)
- `http://localhost:5000/health` — `service.api` (Express API)
- `http://localhost` — nginx-proxied (combines both)

## What's Inside

| Package | Purpose |
|---|---|
| `app.web` | Example React + Vite + TypeScript app |
| `service.api` | Example Express + TypeScript API service |
| `lib.example` | Example shared library — demonstrates the service-library pattern |
| `eslint-config-base` | Base ESLint config for TypeScript packages |
| `eslint-config-node` | ESLint config for Node.js packages |
| `eslint-config-react` | ESLint config for React packages |

## Customizing

**Replace the placeholder scope.** All packages use `@my-org/*`. To use your own:

```bash
# Replace across all files
grep -rl '@my-org' . --include='*.json' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.cjs' --include='*.yml' --include='*.md' \
  | xargs sed -i 's/@my-org/@your-org/g'
```

## Generating New Packages

```bash
# Create a new shared library (e.g. lib.widgets)
npm run new-lib widgets

# Create a new React app (e.g. app.admin)
npm run new-app admin
```

The generator auto-updates:

- Root `package.json` workspaces
- `Dockerfile.app.optimized` (lib COPY layers)
- `vite.shared.config.ts` (dev aliases)

## Scripts

| Script | Purpose |
|---|---|
| `npm run setup` | Bootstrap (Node check, install, build libs, copy .env) |
| `npm run dev` | Native dev (requires local Postgres + Redis) |
| `npm run docker:dev` | Recommended — full stack via Docker Compose |
| `npm run build` | Turbo build everything |
| `npm run test` | Run all tests |
| `npm run lint` | Lint everything |
| `npm run type-check` | TypeScript check |
| `npm run new-app <name>` | Scaffold new React app |
| `npm run new-lib <name>` | Scaffold new shared library |
| `npm run secrets:generate` | Print fresh JWT/session/CSRF secrets |
| `npm run validate:env` | Validate `.env` against required vars |

## Architecture

```
Root (Turborepo)
├── app.web/          # Vite + React frontend
├── service.api/      # Express backend
├── lib.example/      # Shared TS library (Jest tests)
├── eslint-config-*/  # Shared ESLint configs
├── scripts/          # Generator + setup scripts
├── nginx/            # Reverse proxy config
├── .github/          # CI/CD workflows
└── docker-compose.yml
```

**Build order** is handled by Turbo via `dependsOn: ["^build"]`: libs build before apps automatically.

## Tech Stack

- **Build**: Turborepo, npm workspaces
- **Frontend**: React 18, Vite, TypeScript (strict)
- **Backend**: Express, TypeScript (strict)
- **Testing**: Jest (libs) + Vitest (apps & service)
- **Linting**: ESLint + Prettier (shared configs)
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Containers**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## Documentation

- See `.github/workflows/` for CI/CD pipeline
- See `scripts/README.md` for generator script details
- See `.claude/CLAUDE.md` for development guidelines

## License

MIT
