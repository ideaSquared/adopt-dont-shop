# Microservices + Shared Libraries Architecture

## Overview

The Adopt Don't Shop platform uses a hybrid microservices architecture combining shared libraries with a single database. This approach balances modularity with simplicity, avoiding the complexity of distributed databases while maintaining code reusability.

## Architecture Pattern

### Current Implementation

```
┌─────────────────────────────────────────────────────┐
│              Shared Libraries (npm workspace)        │
│  @adopt-dont-shop/lib.api, lib-auth, lib-chat...   │
└─────────────────────────────────────────────────────┘
                           │
                    workspace:* dependency
                           │
┌─────────────────────────────────────────────────────┐
│                  Applications                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │app.client│ │app.admin │ │app.rescue│            │
│  │app.rescue│ │service.* │ │          │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────┘
                           │
                    All connect to
                           │
┌─────────────────────────────────────────────────────┐
│              Single PostgreSQL Database              │
│  (Shared across all services)                       │
└─────────────────────────────────────────────────────┘
```

### Key Characteristics

**✅ Shared Libraries**

- 21 libraries with consistent ESM architecture
- TypeScript-first with full type safety
- Linked as npm workspace dependencies (`"*"` version)
- Tested independently

**✅ Single Database**

- PostgreSQL with PostGIS
- Shared schema across all services
- Centralized migrations
- Simplified transactions and data consistency

**✅ Microservice Apps**

- Frontend apps (React + Vite)
- Backend services (Node.js + Express)
- Independent deployment
- Shared infrastructure

## Library Architecture

### Standards

All libraries follow these standards:

- **Module System**: ES Modules first; a few libraries (`lib.api`, `lib.permissions`, `lib.types`, `lib.validation`) also emit a CJS bundle for backend consumers
- **Build Tool**: TypeScript Compiler (`tsc`) for most libs; `lib.components` uses Vite to bundle assets and styles
- **Testing**: Jest for Node libs, Vitest for libs co-located with apps and `service.backend`
- **Code Quality**: ESLint + Prettier
- **Documentation**: Each library has its own README next to the source

### Library Structure

```
lib.{name}/
├── src/
│   ├── services/
│   │   ├── {name}-service.ts
│   │   └── __tests__/
│   │       └── {name}-service.test.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── dist/              # Build output
├── package.json       # ESM configuration
├── tsconfig.json      # TypeScript config
└── README.md          # Documentation
```

### Library Categories

The canonical index with links is in [`docs/libraries/README.md`](../libraries/README.md). Categorised here for orientation:

**Transport & data (3)**

- `lib.api` — HTTP client, interceptors, auth-token plumbing
- `lib.types` — shared types/constants (zero-dependency)
- `lib.validation` — Zod schemas

**Auth & access (3)**

- `lib.auth` — sessions, two-factor, `AuthProvider` / `useAuth`
- `lib.permissions` — RBAC + field-level permissions
- `lib.invitations` — staff/user invitations

**Domain services (10)**

- `lib.applications`, `lib.chat`, `lib.discovery`, `lib.notifications`, `lib.pets`, `lib.rescue`, `lib.search`, `lib.moderation`, `lib.support-tickets`, `lib.audit-logs`

**UI & analytics (3)**

- `lib.components` — shared React components
- `lib.analytics` — event tracking
- `lib.feature-flags` — Statsig types

**Utilities (2)**

- `lib.utils` — formatters, locale, env helpers
- `lib.dev-tools` — dev-only tooling

## Database Strategy

### Single Database Benefits

**Advantages:**

- ✅ ACID transactions across domains
- ✅ Simpler deployment and operations
- ✅ No distributed transaction complexity
- ✅ Easier data consistency
- ✅ Centralized migrations
- ✅ Better performance for related data

**When to Use:**

- Platform is medium-scale (< 1M users)
- Strong data relationships exist
- ACID transactions are important
- Team size is small to medium
- Operational simplicity is valued

### Migration Path

If needed in future:

1. **Database per Service** - Split when scaling requires it
2. **Event Sourcing** - Add for audit trail needs
3. **CQRS** - Separate read/write models
4. **Microservices** - Full distributed system

## Development Workflow

### Working with Libraries

```bash
# Build all libraries
npm run build:libs

# Build specific library
cd lib.api && npm run build

# Test library
cd lib.api && npm test

# Watch mode
cd lib.api && npm run dev
```

### Adding New Library

```bash
# Create library structure
mkdir -p lib.{name}/src/{services,types}
cd lib.{name}

# Initialize package.json
npm init -y

# Configure as ESM
# Update package.json: "type": "module"

# Add TypeScript
npm install -D typescript @types/node

# Create tsconfig.json
# Add src/index.ts
# Add src/services/{name}-service.ts
# Add tests
```

### Using Libraries in Apps

```typescript
// package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib.api": "workspace:*",
    "@adopt-dont-shop/lib.auth": "workspace:*"
  }
}

// Import in code
import { apiService } from '@adopt-dont-shop/lib.api';
import { authService } from '@adopt-dont-shop/lib.auth';

const pets = await apiService.get('/api/v1/pets');
const user = authService.getCurrentUser();
```

## Best Practices

### Library Design

- Keep libraries focused and single-purpose
- Minimize dependencies between libraries
- Provide clear, documented public APIs
- Version changes with semantic versioning
- Include comprehensive tests

### Database Design

- Use clear naming conventions
- Add indexes for frequently queried fields
- Document schema in database-schema.md
- Use migrations for all schema changes
- Never modify existing migrations

### Application Structure

- Import only needed libraries
- Use tree-shaking to reduce bundle size
- Follow shared coding standards
- Implement error handling consistently
- Document environment variables

## Docker Integration

### Multi-stage Build Pattern

```dockerfile
# Base stage - install workspace
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build libraries
COPY lib.* ./
RUN npm run build:libs

# Build app
FROM base AS build
COPY app.{name} ./app.{name}
RUN cd app.{name} && npm run build

# Production
FROM nginx:alpine
COPY --from=build /app/app.{name}/dist /usr/share/nginx/html
```

### Benefits

- ✅ Libraries built once, shared across apps
- ✅ Smaller final images (multi-stage)
- ✅ Consistent build environment
- ✅ Optimized for monorepo structure

## Testing Strategy

### Library Tests

- Each library has 8 comprehensive tests
- Test service initialization
- Test method functionality
- Test error handling
- Test edge cases

### Integration Tests

- Test library interactions
- Test database operations
- Test API integrations
- Test end-to-end workflows

### Running Tests

```bash
# All tests
npm test

# Specific library
cd lib.api && npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Performance Optimization

### Library Optimization

- Tree-shake unused exports
- Use dynamic imports for large features
- Minimize library dependencies
- Optimize bundle size

### Database Optimization

- Add indexes for frequent queries
- Use connection pooling
- Optimize query performance
- Monitor slow queries

### Application Optimization

- Code splitting for routes
- Lazy load heavy components
- Cache API responses
- Optimize asset delivery

## Scaling Considerations

### Horizontal Scaling

- Multiple app instances behind load balancer
- Stateless application design
- Session storage in Redis
- Shared file storage (S3)

### Vertical Scaling

- Increase database resources
- Optimize container resources
- Scale Redis cache
- Use CDN for static assets

### Future Migration

When to consider microservices:

- User base > 1M
- Team size > 50 developers
- Different scaling needs per domain
- Complex domain boundaries

## Additional Resources

- **Infrastructure Overview**: [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
- **Docker Setup**: [docker-setup.md](./docker-setup.md)
- **New App Generator**: [new-app-generator.md](./new-app-generator.md)
- **Libraries Documentation**: [../libraries/README.md](../libraries/README.md)
- **Database Schema**: [../backend/database-schema.md](../backend/database-schema.md)
