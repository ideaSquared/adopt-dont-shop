# Shared Libraries Documentation

## Overview

The Adopt Don't Shop monorepo includes **21 shared libraries** under `@adopt-dont-shop/lib.*`. They follow an ESM-only TypeScript architecture and are consumed by the three apps (`app.admin`, `app.client`, `app.rescue`) and the backend (`service.backend`).

For per-library validation status, see [ecosystem-status.md](ecosystem-status.md).

## Library Architecture

### Standards

- **Module System**: ES Modules (no CommonJS)
- **Language**: TypeScript strict mode
- **Build Tool**: TypeScript Compiler (`tsc`) orchestrated via Turborepo
- **Testing**: Jest (Node libraries) / Vitest or Jest (React libraries)
- **Lint/Format**: ESLint + Prettier

### Structure Template

Most libraries follow a shape similar to:

```
lib.{name}/
├── src/
│   ├── index.ts
│   ├── services/ | hooks/ | components/   # depending on library type
│   └── types/index.ts
├── dist/                                   # build output (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Available Libraries

All packages are scoped as `@adopt-dont-shop/lib.<name>`. The authoritative list lives in the root `package.json` workspaces.

### Transport & Data

- **lib.api** — HTTP client, interceptors, auth token handling
- **lib.types** — shared type definitions used across frontend and backend
- **lib.validation** — Zod schemas and validation helpers

### Authentication & Access

- **lib.auth** — JWT session handling, auth context, login/logout flows
- **lib.permissions** — role-based access control and permission checks
- **lib.invitations** — staff/user invitation creation and redemption

### Domain Services

- **lib.applications** — adoption application lifecycle and stage transitions
- **lib.chat** — real-time messaging (WebSocket) and conversation state
- **lib.discovery** — swipe-based pet discovery and recommendation sessions
- **lib.notifications** — multi-channel notification delivery and preferences
- **lib.pets** — pet profile management
- **lib.rescue** — rescue organization profiles, staff, and settings
- **lib.search** — search filters and query building
- **lib.moderation** — reporting and moderation workflow
- **lib.support-tickets** — support ticket creation and tracking
- **lib.audit-logs** — audit logging for sensitive actions

### UI & Analytics

- **lib.components** — shared React components (styled-components)
- **lib.analytics** — event tracking and reporting helpers
- **lib.feature-flags** — feature flag evaluation

### Utilities

- **lib.utils** — shared helpers (formatters, date, string utilities)
- **lib.dev-tools** — development-only tooling

## Quick Start

### Installation

Shared libraries are workspace dependencies referenced with `"*"`:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.api": "*",
    "@adopt-dont-shop/lib.auth": "*"
  }
}
```

Run `npm install` at the repo root to link workspaces.

### Basic Usage

```typescript
import { apiService } from '@adopt-dont-shop/lib.api';
import { useAuth } from '@adopt-dont-shop/lib.auth';
```

Refer to each library's `README.md` for its public API.

## Development

### Building

Turborepo handles build ordering (`dependsOn: ["^build"]`):

```bash
npm run build            # build everything
npm run build:libs       # libraries only
npx turbo build --filter=@adopt-dont-shop/lib.api
```

### Testing

```bash
npm run test                                                # everything
npx turbo test --filter=@adopt-dont-shop/lib.auth           # one library
```

## Integration Patterns

### Backend

```typescript
// service.backend/src/services/example.ts
import { validateUser } from '@adopt-dont-shop/lib.validation';
```

### Frontend

```typescript
// app.client/src/hooks/useAuthSession.ts
import { useAuth } from '@adopt-dont-shop/lib.auth';
```

## Troubleshooting

**Workspace imports not resolving**

```bash
npm install              # relink workspaces
npm run build:libs       # rebuild library dist/ folders
```

**`lib.types` changes not picked up in `service.backend` (Docker dev)**

```bash
npm run docker:rebuild:types
```

## Additional Resources

- [Microservices Standards](../infrastructure/MICROSERVICES-STANDARDS.md)
- [Testing Guide](../backend/testing.md)
- [API Documentation](../backend/api-endpoints.md)
- [Ecosystem Status](./ecosystem-status.md)

### Individual Library Docs

Documentation pages exist for the following libraries (others live only in their `lib.*/README.md`):

- [lib.analytics](./analytics.md)
- [lib.api](./api.md)
- [lib.applications](./applications.md)
- [lib.auth](./auth.md)
- [lib.chat](./chat.md)
- [lib.components](./components.md)
- [lib.discovery](./discovery.md)
- [lib.feature-flags](./feature-flags.md)
- [lib.notifications](./notifications.md)
- [lib.permissions](./permissions.md)
- [lib.pets](./pets.md)
- [lib.rescue](./rescue.md)
- [lib.search](./search.md)
- [lib.utils](./utils.md)
- [lib.validation](./validation.md)
