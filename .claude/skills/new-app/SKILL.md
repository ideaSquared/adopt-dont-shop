---
name: new-app
description: >
  Create a new frontend application in the monorepo. Use when the user asks to create a
  new app, add a new frontend, or scaffold a new app.* package.
disable-model-invocation: true
---

# Create a New App

## Current apps
!`ls -d app.*/ 2>/dev/null | tr '\n' ' '`

## Step 1 — Run the generator

```bash
npm run new-app <app-name> [--template <template>]
```

**App name** must start with `app.` (e.g. `app.dashboard`, `app.staff`).

**Templates:**

| Template | What it includes |
|----------|-----------------|
| `minimal` | React, Auth, React Router, styled-components |
| `standard` | Minimal + React Query, ApiService, Analytics, Error Boundaries |
| `enterprise` | Standard + Feature Flags, Notifications, Permissions |

Default is `standard`. Use `enterprise` for apps that need the full permission/notification
stack. Use `minimal` for simple internal tools.

Examples:
```bash
npm run new-app app.dashboard
npm run new-app app.staff --template enterprise
```

## Step 2 — Verify the generated structure

```
app.<name>/
├── package.json          # @adopt-dont-shop/app.<name>
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── jest.config.js
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── vite-env.d.ts
    ├── components/
    │   └── layout/
    ├── contexts/
    ├── hooks/
    ├── pages/
    ├── services/
    │   └── libraryServices.ts   ← critical — must exist
    ├── types/
    └── utils/
        └── env.ts
```

## Step 3 — Configure the Vite proxy

Open the generated `vite.config.ts` and confirm the proxy is configured correctly.
It should match the pattern from the other apps (not bypass proxy in Docker, but change
target to `service-backend`):

```typescript
const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
const backendHost = isDocker ? 'service-backend' : 'localhost';

// In server config:
proxy: {
  '/api': {
    target: `http://${backendHost}:5000`,
    changeOrigin: true,
    secure: false,
  },
  '/health': {
    target: `http://${backendHost}:5000`,
    changeOrigin: true,
    secure: false,
  },
},
```

If the generated config uses `!isDocker ? { proxy } : undefined`, fix it to always proxy
with the dynamic host. This is required for CSRF to work in Docker.

## Step 4 — Configure libraryServices.ts

Ensure `src/services/libraryServices.ts` initialises `ApiService` with `?? ''` (not `|| 'http://...'`):

```typescript
import { ApiService, AuthenticationError } from '@adopt-dont-shop/lib.api';

export const globalApiService = new ApiService({
  apiUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  debug: import.meta.env.DEV,
  getAuthToken: () =>
    localStorage.getItem('authToken') || localStorage.getItem('accessToken'),
});
```

Using `||` treats an empty string as falsy and falls back to a hardcoded absolute URL,
which breaks CSRF in Docker. Use `??` so an empty string is respected.

## Step 5 — Add to docker-compose.yml

Add a new service entry following the exact pattern of the existing apps:

```yaml
app-<name>:
  build:
    context: .
    dockerfile: Dockerfile.app.optimized
    target: development
    args:
      APP_NAME: app.<name>
  ports:
    - '<port>:3000'          # Pick the next available port (3003, 3004, ...)
  volumes:
    - .:/app
    - /app/node_modules
    - /app/app.<name>/node_modules
  environment:
    NODE_ENV: ${NODE_ENV:-development}
    DOCKER_ENV: 'true'
    VITE_API_BASE_URL: ''    # Empty — requests go through Vite proxy
    VITE_WS_BASE_URL: ws://localhost:5000
    CHOKIDAR_USEPOLLING: true
    CHOKIDAR_INTERVAL: 1000
    CHOKIDAR_AWAITWRITEFINISH: 2000
    NODE_OPTIONS: '--max-old-space-size=3072 --max-semi-space-size=128'
  depends_on:
    - service-backend
  restart: unless-stopped
  healthcheck:
    test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:3000']
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
  mem_limit: 2g
  memswap_limit: 2g
```

`VITE_API_BASE_URL: ''` is intentional — see the api-fetch skill for why.

## Step 6 — Add vite aliases for all libs the app uses

In the new `vite.config.ts`, add source aliases for each library the app imports,
so dev changes to libs are reflected immediately without a build:

```typescript
const libraryAliases = mode === 'development' ? {
  '@adopt-dont-shop/lib.components': resolve(__dirname, '../lib.components/src'),
  '@adopt-dont-shop/lib.api':        resolve(__dirname, '../lib.api/src'),
  '@adopt-dont-shop/lib.auth':       resolve(__dirname, '../lib.auth/src'),
  // ... add others as needed
} : {};
```

## Step 7 — Add to root package.json scripts

Add convenient dev/build/test scripts to the root `package.json` following existing patterns:

```json
"dev:<shortname>":   "turbo run dev --filter=@adopt-dont-shop/app.<name>",
"build:<shortname>": "turbo run build --filter=@adopt-dont-shop/app.<name>",
"test:<shortname>":  "turbo run test --filter=@adopt-dont-shop/app.<name>"
```

## Step 8 — Install and start

```bash
npm install
docker compose up -d --force-recreate app-<name>
```

Or for local dev without Docker:
```bash
npm run dev:<shortname>
```

## Common mistakes

- `VITE_API_BASE_URL` set to `http://localhost:5000` in docker-compose → breaks CSRF
- Vite proxy disabled in Docker (`!isDocker ? proxy : undefined`) → ECONNREFUSED errors
- Missing `DOCKER_ENV: 'true'` in docker-compose → proxy targets wrong host
- Using `||` instead of `??` in libraryServices.ts → empty string ignored, absolute URL used
- Forgetting `npm install` after adding the workspace
