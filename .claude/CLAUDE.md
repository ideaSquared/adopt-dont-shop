# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# Adopt Don't Shop - Development Guidelines

We follow Test-Driven Development (TDD) with a strong emphasis on behaviour-driven testing and functional programming principles. All work should be done in small, incremental changes that maintain a working state through development.

## Quick Reference

- Write tests first (TDD)
- Test behaviour, not implementation
- No `any` types or type assertions
- Immutable data only
- Small, pure functions
- TypeScript strict mode always

**Preferred Tools:**

- **Language**: TypeScript (strict mode)
- **Testing**: Vitest everywhere (`packages/*`, `services/*`, `apps/*`) + React Testing Library for React
- **State Management**: Prefer immutable patterns

---

## Monorepo Architecture

This project is a **Turborepo monorepo** with pnpm workspaces containing multiple applications and shared libraries.

### Project Structure

```
adopt-dont-shop/
├── apps/                       # React + Vite frontends
│   ├── admin/                  #   app.admin — admin dashboard
│   ├── client/                 #   app.client — public adoption portal
│   └── rescue/                 #   app.rescue — rescue org portal
├── services/                   # Fastify gateway + gRPC microservices
│   ├── gateway/                #   REST/WS edge on port 4000
│   ├── auth/ notifications/ pets/ rescue/ applications/
│   └── chat/ moderation/ matching/ cms/ audit/
└── packages/                   # All shared workspace packages
    ├── proto/ events/ authz/   #   service-only shared packages
    ├── db/ observability/ storage/ config-secrets/
    ├── eslint-config-{base,node,react}/
    └── lib.*/                  #   24 frontend-shared libs (lib.api, lib.auth,
                                #   lib.components, lib.types, …)
```

### Working with Packages

**All packages are scoped under `@adopt-dont-shop/`:**

- Apps: `@adopt-dont-shop/app.*` (e.g. `@adopt-dont-shop/app.admin`)
- Libraries: `@adopt-dont-shop/lib.*` (e.g. `@adopt-dont-shop/lib.api`)
- Services: `@adopt-dont-shop/service.*` (e.g. `@adopt-dont-shop/service.gateway`, `@adopt-dont-shop/service.auth`)
- Service-only shared packages: `@adopt-dont-shop/<name>` under `packages/` (e.g. `@adopt-dont-shop/proto`)

**Key Scripts:**

> pnpm is the package manager (version pinned by `package.json` "packageManager").
> Enable it once with `corepack enable` — Corepack then runs the pinned pnpm.

```bash
# Docker dev (primary workflow — full stack with HMR)
# `docker:dev` runs scripts/docker-dev.mjs: a preflight that checks Docker is up,
# .env is present, the Redis host port is free (Windows reserved-range trap),
# rebuilds the shared dev image only when pnpm-lock.yaml / Dockerfile.dev change,
# and prompts before wiping a stale Postgres volume. It composes the base file
# with docker-compose.dev.yml (the dev override).
pnpm docker:dev             # Preflight + start all containers (foreground)
pnpm docker:dev:detach      # Same, in background
pnpm docker:dev:build       # Force-rebuild the dev image, then start
pnpm docker:down            # Stop containers
pnpm docker:reset           # Stop and wipe volumes (incl. DB)
pnpm docker:logs            # Follow logs
pnpm docker:shell:db        # Open psql in database container
# Escape hatches: docker:dev:raw (override, skip preflight), docker:dev:legacy
# (old per-service heavy build). REDIS_HOST_PORT in .env remaps the host Redis
# port (default 6380) if 6379 is reserved.
#
# How the dev stack works: ONE shared image (Dockerfile.dev, Debian/glibc) bakes
# a full workspace `pnpm install`. Containers bind-mount host source for HMR and
# re-expose the image's baked node_modules via anonymous volumes (the host's
# node_modules is never used — its pnpm symlinks are absolute host paths invalid
# in the container). Must be Debian not Alpine: vite/rolldown + sharp need glibc.

# Native dev (no Docker — fastest HMR but you must run Postgres yourself)
pnpm dev                    # Run everything via Turbo (apps + gateway + services)
pnpm dev:apps               # Frontend apps only
pnpm dev:services           # Start Postgres + Redis in Docker (detached)

# Build / test / quality
pnpm build                  # Build everything (Turbo handles ordering)
pnpm build:libs             # Libraries only
pnpm build:apps             # Apps only
pnpm test                   # Test everything
pnpm lint / lint:fix        # Lint
pnpm type-check             # TypeScript type-check
pnpm format / format:check  # Prettier

# Database — each service migrates its own schema automatically when its
# container starts (entrypoint runs `pnpm run --if-present db:migrate`). To
# migrate one service by hand (containers must be running):
docker compose exec service-auth pnpm db:migrate

# Production / staging (Docker — pulls pre-built GHCR images, requires DEPLOY_SHA)
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.staging.yml up -d

# Utilities
pnpm validate:env           # Validate .env against required vars

# Per-package commands — use Turbo's --filter flag directly:
pnpm exec turbo dev --filter=@adopt-dont-shop/lib.api
pnpm exec turbo build --filter=@adopt-dont-shop/app.admin
pnpm exec turbo test --filter=@adopt-dont-shop/service.gateway
```

**Important Monorepo Rules:**

1. **Turbo handles build ordering automatically** via `dependsOn: ["^build"]` — `pnpm build` builds libs before apps. No need to manually sequence.
2. **Libraries hot-reload automatically** in dev — Vite aliases point at their src/ directories for the React apps, and a lib-types-watcher sidecar runs tsc --watch for lib.types so the backend container picks up type changes within seconds.
3. Reference workspace packages with the `workspace:*` protocol (e.g., `"@adopt-dont-shop/lib.api": "workspace:*"`)
4. Changes to shared libraries affect multiple consumers — test thoroughly
5. Each package has its own `package.json`, `tsconfig.json`, and tests

---

## Testing Principles

### Behaviour-Driven Testing

- **No "unit tests"** - this term is not helpful. Tests should verify expected behaviour, treating implementation as a black box
- Test through public APIs exclusively - internals should be invisible to tests
- No 1:1 mapping between testing files and implementation files
- Tests that examine internal implementation detail are wasteful and should be avoided
- **Coverage targets**: 100% coverage should be expected at all times, but these tests must ALWAYS be based on business behaviour, not implementation details
- Tests must document expected business behaviour

#### Testing Tools

- **Vitest** — used by every workspace package: the React apps (`app.admin`, `app.client`, `app.rescue`), every `services/*` and `packages/*`, and every `lib.*` (each ships a `vitest.config.ts` and a `test` script that runs `vitest run`)
- **React Testing Library** for React components
- **MSW (Mock Service Worker)** for API mocking when needed
- All test code must follow the same TypeScript strict mode rules as production code

### Test Organization

**Microservices:**

```
services/auth/src/
  grpc/
    handlers.ts
    handlers.test.ts
```

**Shared Libraries:**

```
packages/lib.auth/src/
    auth-service.ts
    auth-service.test.ts
```

**React Applications:**

```
apps/admin/src/
    components/
        ErrorBoundary.tsx
        ErrorBoundary.test.tsx
    pages/
        Dashboard.tsx
        Dashboard.test.tsx
```

---

## TypeScript Guidelines

### Strict Mode Requirements

- **No `any`** - ever. Use `unknown` if a type is truly unknown
- **No type assertions** (`as SomeType`) unless absolutely necessary with clear justification
- **No `@ts-ignore`** or **`@ts-expect-error`** without explicit explanation
- These rules apply to test code as well as production code

### Type Definitions

- **Prefer `type` over `interface`** in all cases
- Use explicit typing where it aids clarity, but leverage inference where appropriate
- Utilize utility types effectively (`Pick`, `Omit`, `Partial`, `Required`, etc.)
- Create domain-specific types (e.g., `UserId`, `RescueId`) for type safety
- Use Zod or any other [Standard Schema](https://standardschema.dev/) compliant schema library to create types, by creating schemas first

### Schema-First Type Definition

**Always define schemas before types:**

```typescript
// Good: Schema-first approach
import { z } from 'zod';

const UserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
});

type User = z.infer<typeof UserSchema>;

// Bad: Types without validation
type User = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
};
```

---

## Code Style

### Functional Programming

- **No data mutation** - work with immutable data structures
- **Pure functions** wherever possible
- **Composition** as the primary mechanism for code reuse
- Avoid heavy FP abstractions (no need for complex monads or pipe/compose patterns)
- Use array methods (`map`, `filter`, `reduce`) over imperative loops

### Code Structure

- **No nested if/else statements** - use early returns, guard clauses, or composition
- **Avoid deep nesting** in general (max 2 levels)
- Keep functions small and focused on a single responsibility
- Prefer flat, readable code over clever abstractions

### Naming Conventions

- **Functions**: `camelCase`, verb-based
- **Types**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE` for true constants, `camelCase` for configuration
- **Files**: `kebab-case` for all TypeScript files
- **Test files**: `*.test.ts` or `*.spec.ts`

---

## Backend Patterns (Fastify gateway + gRPC microservices)

### Architecture: Gateway routes → gRPC handlers → DB

```
HTTP request
  → services/gateway      (Fastify plugin under src/routes/*.ts)
    → grpc-client         (services/gateway/src/grpc-clients/*-client.ts)
      → services/<name>   (gRPC handler in src/grpc/*-handlers.ts)
        → pg.Pool         (raw SQL — no ORM)
HTTP response
```

The gateway is the only HTTP edge. Every microservice (`auth`, `pets`, `applications`, `rescue`, `chat`, `notifications`, `moderation`, `matching`, `cms`, `audit`) speaks gRPC inbound and owns its own Postgres schema via `@adopt-dont-shop/db` (a thin `pg.Pool` wrapper). There is no Sequelize, no ORM, and no `models/` directory.

**Gateway routes** (`services/gateway/src/routes/*.ts`):

- Fastify plugins, one file per `/api/v1/<domain>` surface (`auth.ts`, `pets.ts`, …)
- Validate request bodies with explicit Zod / TS-typed shapes
- Build gRPC metadata via `buildMetadata(req)` (auth headers, request ID)
- Translate gRPC errors via `handleGrpcError(err, reply)` so clients get the right HTTP status
- NO business logic — just REST → gRPC translation, rate-limiting, and OpenAPI schema

**gRPC handlers** (`services/<name>/src/grpc/*-handlers.ts`):

- Pure async functions: `(deps, principal, request) → Promise<response>`
- `deps` carries the `pg.Pool` and any injected seams (password hasher, token issuer, …) so tests stay fast (no real bcrypt rounds, no JWT lib calls)
- `principal` (`@adopt-dont-shop/authz.Principal`) is forwarded from the gateway; `requirePermission(principal, PERM)` is the gate
- State-changing handlers run DB writes + NATS events inside `withTransaction(deps, async ({ client, publish }) => { … })` from `@adopt-dont-shop/events` so events only fire on commit (publish-after-commit)
- The `adapter.ts` per service wraps these pure handlers in the grpc-js `(call, callback)` signature and maps `HandlerError` codes to `grpc.status.*`

**Persistence** (`services/<name>/src/`):

- Schema lives in `migrations/NNN_*.ts` (3-digit prefix, snake_case) and runs through `node-pg-migrate` via `db:migrate`
- Each service owns ONE Postgres schema (`auth`, `pets`, …); the connection's `search_path` is set to `<schema>, public` (so PostGIS in `public` resolves)
- Cross-schema FKs are deliberately omitted — they're application-side per the schema-per-service rule
- Reads/writes are raw parameterised SQL through `deps.pool` / `client`

### Gateway route pattern (Fastify plugin)

```typescript
// services/gateway/src/routes/auth.ts (excerpt)
import type { FastifyInstance } from 'fastify';
import { type LoginRequest } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

export async function authRoutes(app: FastifyInstance, { client }: { client: AuthClient }) {
  app.post('/api/v1/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return reply.code(400).send({ error: 'email and password are required' });
    }

    try {
      const res = await client.login(
        { email: body.email, password: body.password } satisfies LoginRequest,
        buildMetadata(req),
      );
      return reply.code(200).send(res);
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });
}
```

### gRPC handler pattern (pure function over deps)

```typescript
// services/<name>/src/grpc/handlers.ts (excerpt)
import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';

export type HandlerDeps = WithTransactionDeps & {
  // Any per-handler seams (password hasher, token issuer, clock, …)
};

export class HandlerError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_ARGUMENT' | 'UNAUTHENTICATED' | 'PERMISSION_DENIED'
      | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'INTERNAL',
    message: string,
  ) {
    super(message);
    this.name = 'HandlerError';
  }
}

export async function getUser(
  deps: HandlerDeps,
  principal: Principal,
  req: { userId: string },
) {
  requirePermission(principal, 'user.read');

  const { rows } = await deps.pool.query<{ user_id: string; email: string; status: string }>(
    `SELECT user_id, email, status FROM auth.users WHERE user_id = $1`,
    [req.userId],
  );
  const user = rows[0];
  if (!user) throw new HandlerError('NOT_FOUND', 'user not found');
  if (user.status === 'suspended') throw new HandlerError('PERMISSION_DENIED', 'user is suspended');
  return user;
}
```

State-changing handlers wrap the write + event in `withTransaction`:

```typescript
await withTransaction(deps, async ({ client, publish }) => {
  await client.query(
    `INSERT INTO pets.pets (pet_id, name, rescue_id) VALUES ($1, $2, $3)`,
    [petId, payload.name, payload.rescueId],
  );
  publish({
    type: 'pets.actionTaken',
    id: `pets.created.${petId}`,
    payload: {
      service: 'service.pets',
      aggregateType: 'pet',
      aggregateId: petId,
      action: 'create',
      actorUserId: principal.userId,
    },
  });
});
```

### Database migrations (node-pg-migrate)

- Migrations in `services/<name>/src/migrations/` (each service owns and runs its own)
- 3-digit snake_case numbering: `001_create_users.ts`, `002_create_roles.ts`, …
- Export `up` (and `down` when reversible) functions taking a `MigrationBuilder` from `node-pg-migrate`
- NEVER modify existing migrations — create a new one
- Run automatically on container start via the entrypoint; manually with `docker compose exec service-<name> pnpm db:migrate`

```typescript
// services/<name>/src/migrations/001_create_users.ts
import type { MigrationBuilder } from 'node-pg-migrate';

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;');

  pgm.createType('user_status', ['active', 'inactive', 'suspended']);

  pgm.createTable('users', {
    user_id: { type: 'uuid', primaryKey: true },
    email: { type: 'citext', notNull: true, unique: true },
    status: { type: 'user_status', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('users', ['email']);
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.dropTable('users');
  pgm.dropType('user_status');
};
```

### Authentication / authorization

- The gateway's `authenticate` Fastify hook verifies the JWT (or session) and stamps `x-user-*` metadata on the gRPC call
- Service handlers receive the `Principal` already; never re-decode the JWT — `requirePermission(principal, PERMISSION)` is the gate
- Permission constants are exported from `@adopt-dont-shop/lib.types` (`ADMIN_AUDIT_LOGS`, …)
- Defence-in-depth: the gateway gates first; handlers MUST re-check, because the handler can't trust the metadata stamper

### Logging vs. Auditing — two layers

The backend separates **operational logs** (Layer 1) from **audit events** (Layer 2). Use the right tool for the job:

| | Layer 1 — `logger.*` | Layer 2 — audit |
|---|---|---|
| **Purpose** | Debugging, ops, "what happened" | Forensics, "who did what to what" |
| **Storage** | console + files + Loki (when `LOKI_URL` set) | immutable `audit.audit_events` table + Loki |
| **How to emit** | `logger.info/warn/error(...)` via `@adopt-dont-shop/observability` | NATS `<domain>.actionTaken` event inside `withTransaction` |

**Audit events are produced by publishing a `<domain>.actionTaken` NATS event** from inside a `withTransaction` block (so the event only fires on commit — the publish-after-commit pattern that `@adopt-dont-shop/events.withTransaction` enforces). The `services/audit` service subscribes to the wildcard `*.actionTaken` subject and persists every event row in the `audit.audit_events` table (idempotent via the producer's NATS message id).

```typescript
// In a state-changing handler
await withTransaction(deps, async ({ client, publish }) => {
  await client.query(
    `UPDATE pets.pets SET name = $1, updated_at = now() WHERE pet_id = $2`,
    [changes.name, petId],
  );
  publish({
    type: 'pets.actionTaken',
    id: `pets.updated.${petId}.${Date.now()}`,
    payload: {
      service: 'service.pets',
      aggregateType: 'pet',
      aggregateId: petId,
      action: 'update',
      actorUserId: principal.userId,
      details: { before, after },  // ← for sensitive entities, capture deltas
    },
  });
});
```

The payload shape (`AuditEventPayload`) is documented in `services/audit/src/nats/event-types.ts`. Action names are lower-case domain verbs (`create`, `update`, `delete`, `submit`, `approve`, …).

**For UPDATE operations on sensitive entities**, read the previous row inside the same transaction and include `{ before, after }` in `details` so the audit trail tells the full story. There is no longer a `diffSequelize` helper — services use raw SQL.

**Never** log secrets or PII to Layer 1 without going through the redaction helpers in `@adopt-dont-shop/observability`. Audit payloads are also redacted by the Winston pipeline, but the `audit.audit_events` row is durable storage — treat it accordingly.

---

## Frontend Patterns (React + Vite)

### Component Organization

```
app.*/src/
  components/
    layout/          # Layout components (Header, Sidebar, etc.)
    ui/             # Reusable UI components (Button, Card, etc.)
    data/           # Data-display components (DataTable, etc.)
  pages/            # Page-level components (routes)
  contexts/         # React contexts
  hooks/            # Custom hooks
  services/         # API service clients
  types/            # TypeScript type definitions
  utils/            # Utility functions
```

### Component Patterns

**Functional Components Only:**

```typescript
// Good: Functional component with TypeScript
type UserCardProps = {
  userId: string;
  name: string;
  email: string;
  onEdit: (userId: string) => void;
};

export const UserCard = ({ userId, name, email, onEdit }: UserCardProps) => {
  const handleEdit = () => {
    onEdit(userId);
  };

  return (
    <Card>
      <h3>{name}</h3>
      <p>{email}</p>
      <Button onClick={handleEdit}>Edit</Button>
    </Card>
  );
};

// Bad: Class component
class UserCard extends Component<UserCardProps> { ... }
```

### Hooks Patterns

```typescript
// Custom hooks should start with 'use'
export const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await userService.getUser(userId);
        setUser(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  return { user, loading, error };
};
```

### Styling (vanilla-extract)

Styles are authored using [vanilla-extract](https://vanilla-extract.style/) (`.css.ts` files). Theme tokens are imported from `packages/lib.components/src/styles/theme.css.ts` as `vars`:

```typescript
// Component.css.ts
import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const card = style({
  backgroundColor: vars.background.primary,
  borderRadius: vars.borderRadius.base,
  padding: vars.spacing['4'],
  boxShadow: vars.shadows.sm,
});

export const button = style({
  backgroundColor: vars.colors.primary,
  color: vars.text.inverse,
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  borderRadius: vars.borderRadius.base,
  border: 'none',
  cursor: 'pointer',
});
```

### State Management

- **React Query** for server state
- **React Context** for shared UI state
- **Local state** (useState) for component-specific state
- Avoid prop drilling - use context or composition

---

## Error Handling & Async Patterns

### Async/Await Conventions

**Always use try/catch with async/await:**

```typescript
// Good: Proper error handling
async function fetchUser(userId: string): Promise<User> {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { userId, error });
    throw error;
  }
}

// Bad: No error handling
async function fetchUser(userId: string): Promise<User> {
  const user = await User.findByPk(userId);
  return user; // What if this fails?
}
```

### Service-Level Error Handling

**Create custom error classes:**

```typescript
export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### React Error Boundaries

**Every app should have an ErrorBoundary:**

```typescript
// Wrap your app
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### API Error Handling

The gateway centralises gRPC → HTTP mapping in `services/gateway/src/middleware/grpc-error.ts`. Every route calls `handleGrpcError(err, reply)` in its `catch`; the helper maps `grpc.status.*` to the right HTTP status and returns generic messages for 5xx (so internal stack fragments never leak) while forwarding the upstream text only for the client-facing 4xx codes on its allowlist:

```typescript
import { handleGrpcError } from '../middleware/grpc-error.js';

try {
  const res = await client.getUser({ userId }, buildMetadata(req));
  return reply.code(200).send(res);
} catch (err) {
  return handleGrpcError(err, reply);
}
```

Inside a gRPC handler, throw a `HandlerError` with one of the documented codes (`INVALID_ARGUMENT`, `UNAUTHENTICATED`, `PERMISSION_DENIED`, `NOT_FOUND`, `ALREADY_EXISTS`, `INTERNAL`) and let the adapter translate it into the matching `grpc.status.*` — the gateway will finish the mapping to HTTP.

### Frontend Error Handling

```typescript
// Use try/catch in service methods
export class UserService {
  async getUser(userId: string): Promise<User> {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('User not found');
      }
      throw new Error('Failed to fetch user');
    }
  }
}
```

---

## API Design Patterns

### RESTful Conventions

```
GET    /api/v1/users              # List users
GET    /api/v1/users/:userId      # Get user
POST   /api/v1/users              # Create user
PUT    /api/v1/users/:userId      # Update user (full)
PATCH  /api/v1/users/:userId      # Update user (partial)
DELETE /api/v1/users/:userId      # Delete user
```

### Request/Response Types

**Define types for all API interactions:**

```typescript
// Request types
type CreateUserRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

// Response types
type UserResponse = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
};

type ApiResponse<T> = {
  data: T;
  message?: string;
};

type ApiErrorResponse = {
  error: string;
  details?: string[];
};
```

### Pagination

```typescript
type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

---

## Database Patterns

### Migrations

Migrations are covered in **Backend Patterns → Database migrations (node-pg-migrate)** above — the same `MigrationBuilder`-based pattern applies everywhere. Key rules:

- Files live in `services/<name>/src/migrations/` with a 3-digit snake_case prefix (`001_create_users.ts`, `002_create_roles.ts`, …)
- Never modify a shipped migration — add a new one
- Include a `down` when the change is reversible

### Cross-schema relationships

There are **no ORM-level associations and no cross-schema foreign keys**. Each service owns exactly one Postgres schema, and referential integrity between schemas is enforced application-side (the schema-per-service rule). Store the other aggregate's id as a UUID column, look the record up over gRPC when you need the row, and let the audit trail (via NATS `<domain>.actionTaken` events) tell the join story after the fact.

### Seeders

- Seed / dev data lives with each service in `services/<name>/src/db/seed.ts` and runs via `pnpm --filter @adopt-dont-shop/service.<name> db:seed`
- Seeders must be idempotent (safe to run more than once) — the e2e suite depends on that
- The gateway-level `pnpm db:seed` script (`scripts/seed.mjs`) fans the per-service seeders out in one command

---

## Development Workflow

### TDD Process

Follow Red-Green-Refactor strictly:

1. **Red**: Write a failing test for the desired behaviour
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up the code while keeping tests green

### Commit Guidelines

- Each commit should represent a complete, working change
- Use conventional commits format:

```
feat: add user invitation system
fix: correct date format in rescue profile
refactor: extract rescue validation logic
test: add edge cases for rescue registration
```

- Include test changes with feature changes in the same commit

### Pull Request Standards

- Every PR must have all tests passing
- All linting and quality checks must pass
- Work in small increments that maintain a working state
- PRs should be focused on a single feature or fix
- Include description of the behaviour change, not implementation details

---

## Working with Claude

### Expectations

When working with the code:

1. **Think deeply and carefully** before making any edits
2. **Understand the full context** of the code and the requirements
3. **Ask clarifying questions** when requirements are ambiguous
4. **Think from first principles** - don't make assumptions
5. **Follow TDD** - always write or modify tests first

### Code Changes

When suggesting or making changes:

- Respect the existing patterns and conventions
- Maintain test coverage for all behaviour changes
- Follow TDD - write or modify tests first
- Keep changes small and incremental
- Ensure all TypeScript strict mode requirements are met
- Provide rationale for significant design decisions

### Communication

- Be explicit about trade-offs in different approaches
- Explain the reasoning behind significant design decisions
- Flag any deviations from these guidelines with justification
- Suggest improvements that align with these principles
- When unsure, ask for clarification rather than assuming

### Monorepo Awareness

When working across packages:

- Understand which packages depend on your changes
- Build libraries before testing dependent apps
- Consider the impact on all consuming packages
- Test changes in the context of the full application
- Update shared types consistently across packages
