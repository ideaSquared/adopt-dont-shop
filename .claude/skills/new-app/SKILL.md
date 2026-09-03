---
name: new-app
description: >
  Create a new frontend application in the monorepo. Use when the user asks to create a
  new app, add a new frontend, or scaffold a new app.* package.
disable-model-invocation: true
---

# Create a New App

## Current apps

!`ls -d apps/*/ 2>/dev/null | tr '\n' ' '`

## Step 1 — Run the generator

```bash
pnpm new-app <app-name> [--template <template>]
```

**App name** must start with `app.` (e.g. `app.dashboard`, `app.staff`). The `app.` prefix is
stripped for the directory: `pnpm new-app app.dashboard` creates `apps/dashboard/`, while the package
keeps the full name `@adopt-dont-shop/app.dashboard`.

**Templates** (dependency lists live in each template's `package.json`):

| Template     | What it includes                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| `minimal`    | React, `lib.auth`, React Router, vanilla-extract                                                               |
| `standard`   | Minimal + React Query, `lib.api`, `lib.analytics`, Error Boundaries                                            |
| `enterprise` | Standard + `lib.feature-flags`, `lib.notifications`, `lib.permissions`, `lib.discovery`, `lib.search`, Statsig |

Default is `standard`. Use `enterprise` for the full permission/notification stack; `minimal` for
simple internal tools.

```bash
pnpm new-app app.dashboard
pnpm new-app app.staff --template enterprise
```

The generator already does a lot for you (see the [`new-app-generator` doc](../../../docs/infrastructure/new-app-generator.md)):
it creates `apps/<slug>/` from `common/` + the template, creates the empty scaffolding dirs, and
registers the workspace (`pnpm-workspace.yaml` already globs `apps/*`). It prints a reminder about
the Docker dev-volume mount (step 4 below).

## Step 2 — Verify the generated structure

```
apps/<slug>/
├── package.json          # @adopt-dont-shop/app.<slug>
├── tsconfig.json  tsconfig.node.json
├── vite.config.ts        # imports getLibraryAliases; proxies /api to the gateway
├── vitest.config.ts      # Vitest, not Jest — there is no jest.config
├── index.html
├── README.md
└── src/
    ├── main.tsx  App.tsx
    ├── vite-env.d.ts
    ├── components/dev/DevLoginPanel.{tsx,css.ts}
    ├── contexts/AuthContext.tsx      # + Analytics/Notifications/Permissions/Statsig (standard/enterprise)
    ├── pages/HomePage.{tsx,css.ts}
    └── hooks/ services/ utils/ types/ test-utils/ __tests__/   # empty scaffolding dirs
```

Note: the generator does **not** create a `src/services/libraryServices.ts` — you add it (step 3) if
the app talks to the backend.

## Step 3 — Vite proxy and library aliases (already wired)

The generated `vite.config.ts` already imports `getLibraryAliases` from `../../vite.shared.config`
and proxies `/api`, `/health`, `/monitoring` to the gateway. Just confirm it matches the other apps —
do **not** hand-roll per-lib aliases or the proxy block:

```typescript
import { getLibraryAliases } from '../../vite.shared.config';

const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
const backendHost = isDocker ? 'service-gateway' : '127.0.0.1'; // 127.0.0.1, NOT localhost (IPv6)
const backendPort = 4000;
const libraryAliases = getLibraryAliases(__dirname, mode);
```

Adding a new `lib.*` for every app is a one-line edit in `vite.shared.config.ts` — never a per-app
alias list.

## Step 4 — Configure the shared apiService (if the app calls the backend)

Add `src/services/libraryServices.ts` that configures the shared `apiService` singleton via
`updateConfig` — there is **no** token reader; auth tokens are httpOnly cookies sent with
`credentials: 'include'`:

```typescript
import { apiService as globalApiService } from '@adopt-dont-shop/lib.api';

globalApiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_BASE_URL ?? '', // '' in Docker → relative URLs through the proxy
  debug: import.meta.env.DEV,
});

// Import and construct domain services AFTER configuring the global apiService.
import { PermissionsService } from '@adopt-dont-shop/lib.permissions';
export const permissionsService = new PermissionsService({
  apiUrl: import.meta.env.VITE_API_BASE_URL ?? '',
});
```

Use `??` (not `||`) so an empty string is respected — `||` would fall back to a hardcoded absolute
URL and break CSRF in Docker. See the `api-fetch` skill.

## Step 5 — Add the app to docker-compose.yml

Apps share the root `Dockerfile.app` (built with an `APP_NAME` arg) via YAML anchors. Copy an existing
block (e.g. `app-rescue`) and parameterise it. **`profiles` is required** or the service never starts
under `pnpm docker:dev`:

```yaml
app-<slug>:
  profiles: ["<slug>", "full"]
  build:
    <<: *app-build-defaults        # context: ., dockerfile: Dockerfile.app, target: development
    args:
      APP_NAME: <slug>
  ports:
    - '127.0.0.1:<port>:3000'      # next free host port; container port is always 3000
  volumes:
    - .:/app
    - /app/node_modules
    - /app/apps/<slug>/node_modules
  environment:
    <<: *app-env                   # includes VITE_API_BASE_URL: '' and DOCKER_ENV: 'true'
  <<: *app-common                  # depends_on: service-gateway, healthcheck, mem limits
```

## Step 6 — Add the node_modules mount to the dev stack

Add the app's line to the `x-dev-volumes` anchor in `docker-compose.dev.yml`
(`pnpm check:workspaces` fails CI if it drifts from the filesystem):

```yaml
- /app/apps/<slug>/node_modules
```

## Step 7 — Install and start

```bash
pnpm install
docker compose --profile <slug> up -d --force-recreate app-<slug>
```

Or for local dev without Docker:

```bash
pnpm --filter @adopt-dont-shop/app.<slug> dev
```

## Common mistakes

- `VITE_API_BASE_URL` set to an absolute URL in compose → breaks CSRF; keep it `''` (from `*app-env`)
- Hand-rolling per-lib Vite aliases instead of `getLibraryAliases` → drifts from the shared list
- Proxy target `service-backend:5000` or `localhost:5000` → the monolith is gone; use `service-gateway:4000` / `127.0.0.1:4000`
- Reading tokens from `localStorage` in `libraryServices.ts` → tokens are httpOnly cookies; use `updateConfig` only
- Omitting `profiles` on the compose service → it never starts under `pnpm docker:dev`
- Forgetting the `x-dev-volumes` mount → `pnpm check:workspaces` fails
- Using `||` instead of `??` for `VITE_API_BASE_URL`

Canonical doc: [`docs/infrastructure/new-app-generator.md`](../../../docs/infrastructure/new-app-generator.md) and [`docs/templates/README.app.md`](../../../docs/templates/README.app.md).
