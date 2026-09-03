# New App Generator

_How `pnpm new-app` scaffolds a new React app: the CLI, what the generator does for you, the files it
writes, and the manual wiring (compose, nginx, dev volumes) you still add. Verified against
`scripts/create-new-app.js` and `scripts/templates/app/`._

## Overview

The `pnpm new-app` command scaffolds new React applications under `apps/` with the established
patterns and shared libraries pre-configured.

## What the generator already does

`scripts/create-new-app.js` performs these steps for you — you do **not** do them by hand:

1. Creates the app directory at `apps/<slug>/` (the `app.` prefix is stripped: `pnpm new-app app.foo`
   → `apps/foo/`), copying `scripts/templates/app/common/` first, then overlaying the chosen template.
2. Creates the empty scaffolding dirs `public/` and `src/{hooks,services,utils,types,test-utils,__tests__}`.
3. Registers the workspace via `registerWorkspace()` — since `pnpm-workspace.yaml` already globs
   `apps/*`, no edit is needed.
4. Prints a reminder to add the app's `node_modules` mount to the dev stack (see step 3 below).

## Usage

```bash
pnpm new-app <app-name> [template] [--overwrite]
# or:
pnpm new-app <app-name> --template <template>
```

### Parameters

- **app-name**: Application name (e.g., `app.mobile`, `app.veterinary`)
- **template**: One of `minimal`, `standard`, `enterprise` (defaults to `standard` if omitted)
- **--overwrite**: Replace an existing app directory of the same name

The generator only scaffolds React apps under `app.*`. Backend services are not produced by this script — the backend is a set of microservices under `services/<name>/`; add a new backend domain by creating a new service there, not via this generator.

### Templates

| Template     | Description                                        | Pre-installed libraries                                                                                                                                                                                  |
| ------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`    | Basic React app with auth and routing              | `lib.components`, `lib.auth`                                                                                                                                                                             |
| `standard`   | Full-featured app with data fetching and analytics | `lib.components`, `lib.auth`, `lib.analytics`, `lib.api`, `@tanstack/react-query`                                                                                                                        |
| `enterprise` | Complete enterprise app with all features          | `lib.components`, `lib.auth`, `lib.analytics`, `lib.api`, `lib.feature-flags`, `lib.notifications`, `lib.permissions`, `lib.discovery`, `lib.search`, `@statsig/react-bindings`, `@tanstack/react-query` |

## Examples

```bash
# Mobile adoption app (standard template)
pnpm new-app app.mobile

# Pick a template explicitly
pnpm new-app app.veterinary minimal
pnpm new-app app.superadmin enterprise

# Replace an existing scaffold
pnpm new-app app.mobile standard --overwrite
```

## What gets created

Files written into `apps/<slug>/` (a `common/` layer plus the chosen template):

```
apps/{slug}/
├── index.html                       # from common/
├── package.json                     # from the template (deps per template)
├── tsconfig.json  tsconfig.node.json
├── vite-env.d.ts
├── vite.config.ts                   # imports getLibraryAliases; proxies /api to the gateway
├── vitest.config.ts
├── README.md
├── src/
│   ├── App.tsx  main.tsx            # from the template
│   ├── components/dev/DevLoginPanel.{tsx,css.ts}
│   ├── contexts/AuthContext.tsx     # (+ Analytics/Notifications/Permissions/Statsig for standard/enterprise)
│   ├── pages/HomePage.{tsx,css.ts}
│   ├── hooks/  services/  utils/  types/  test-utils/  __tests__/   # empty scaffolding dirs
│   └── ...
└── public/                          # empty
```

There is **no** generated `Dockerfile`, `.env.example`, `src/styles/`, or `src/pages/` route tree —
apps share the root `Dockerfile.app` and load env from the monorepo-root `.env` via `envDir` in
`vite.config.ts`.

### Backend services

This generator produces frontend `app.*` packages only. To add a backend microservice (Fastify +
gRPC, `pg` + `node-pg-migrate`), follow [`new-microservice.md`](./new-microservice.md).

## Post-generation steps

### 1. Install dependencies

```bash
pnpm install
```

### 2. Add the app to docker-compose.yml

Apps are containerised by the shared root `Dockerfile.app` with an `APP_NAME` build arg — there is no
per-app Dockerfile. Copy an existing app block (e.g. `app-rescue`) and parameterise it. The service is
`app-<slug>`, uses the shared YAML anchors, and **must** declare `profiles` or it never starts under
`pnpm docker:dev`:

```yaml
app-{slug}:
  profiles: ["{slug}", "full"]
  build:
    <<: *app-build-defaults          # context: ., dockerfile: Dockerfile.app, target: development
    args:
      APP_NAME: {slug}
  ports:
    - '127.0.0.1:300X:3000'          # pick a free host port; container port is always 3000
  volumes:
    - .:/app
    - /app/node_modules
    - /app/apps/{slug}/node_modules  # anon volume re-exposing the baked node_modules
  environment:
    <<: *app-env
  <<: *app-common
```

### 3. Add the node_modules mount to the dev stack

Add the app's line to the `x-dev-volumes` anchor in `docker-compose.dev.yml` (`pnpm check:workspaces`
fails CI if this list drifts from the filesystem):

```yaml
- /app/apps/{slug}/node_modules
```

### 4. Add nginx subdomain routing (optional; `--profile full`)

Add an upstream and a server block to `nginx/nginx.conf`, mirroring the `rescue` entries:

```nginx
upstream {slug} {
    server app-{slug}:3000;
}

server {
    listen 80;
    server_name {slug}.localhost;

    location / {
        proxy_pass http://{slug};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### 5. Start development

```bash
# Full stack via Docker (the app needs its profile enabled)
docker compose --profile {slug} up app-{slug}

# Or locally
pnpm --filter @adopt-dont-shop/app.{slug} dev
```

## Customization

### Adding More Libraries

Edit `package.json` to add libraries:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.storage": "workspace:*",
    "@adopt-dont-shop/lib.email": "workspace:*"
  }
}
```

### Modifying Templates

Generator templates live under `scripts/templates/`. The app generator copies `app/common/` first,
then overlays the chosen template:

```
scripts/templates/
├── app/
│   ├── common/       # copied into every app (config, HomePage, DevLoginPanel, AuthContext)
│   ├── minimal/      # + package.json, App.tsx, main.tsx
│   ├── standard/     # + AnalyticsContext
│   └── enterprise/   # + Analytics/FeatureFlags/Notifications/Permissions/Statsig contexts
└── lib/
    ├── common/  service/  utility/   # used by the lib generator, not this one
```

## Best Practices

### Naming Conventions

- Frontend apps: `app.{purpose}` (e.g., `app.mobile`, `app.foster`)
- Backend services: `service.{domain}` (e.g., `service.payments`, `service.analytics`)
- Use lowercase with dots as separators

### Library Selection

- Only include libraries your app actually needs
- Avoid over-installing to keep bundle sizes small
- Use tree-shaking to eliminate unused code

### Configuration

- Use `VITE_*` environment variables for all configuration (loaded from the monorepo-root `.env` via `envDir`)
- Never commit `.env` files
- Document the app's env vars in its `README.md` and `docs/env-reference.md`

## Troubleshooting

### Port Already in Use

```bash
# Find and kill the process using the port (Linux/macOS)
lsof -ti:3000 | xargs kill
```

### Library Not Found

```bash
# Rebuild libraries
pnpm build:libs

# Reinstall dependencies
rm -rf node_modules && pnpm install
```

### Docker Build Fails

```bash
# Clear Docker cache
docker compose down -v
docker system prune -a

# Rebuild without cache
docker compose build --no-cache app-{slug}
```

## Additional Resources

- **Infrastructure Guide**: [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
- **Docker Setup**: [DOCKER.md](../DOCKER.md)
- **Microservices Standards**: [MICROSERVICES-STANDARDS.md](./MICROSERVICES-STANDARDS.md)
- **Libraries Documentation**: [../libraries/README.md](../libraries/README.md)
