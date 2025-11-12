# Shared Libraries Documentation

## Overview

Comprehensive collection of 16 shared libraries for the Adopt Don't Shop platform. All libraries follow consistent ESM-only architecture with full TypeScript support and comprehensive testing.

## Ecosystem Status

**All 16 libraries fully validated:**

- TypeScript compilation: 100% passing
- Jest test suites: 8/8 tests per library passing
- PRD compliance: Full backend service alignment
- Architecture: ESM-only with consistent patterns

View detailed status: [ecosystem-status.md](ecosystem-status.md)

## Library Architecture

### Standards

- **Module System**: ES Modules only (no CommonJS)
- **Build Tool**: TypeScript Compiler (tsc)
- **Testing**: Jest with TypeScript
- **Code Quality**: ESLint + Prettier
- **Docker**: Multi-stage builds
- **CI/CD**: Integrated with Turbo

### Structure Template

```
lib.{name}/
├── src/
│   ├── services/{name}-service.ts
│   ├── services/__tests__/{name}-service.test.ts
│   ├── types/index.ts
│   └── index.ts
├── dist/ (auto-generated)
├── Dockerfile
├── package.json (ESM-only)
├── tsconfig.json
└── README.md
```

## Available Libraries

### Core Services

**lib.api** - API client functionality

- HTTP client with authentication
- Request/response interceptors
- Error handling and retry logic
- Package: `@adopt-dont-shop/lib-api`

**lib.auth** - Authentication and authorization

- JWT token management
- User session handling
- Role-based permissions
- Package: `@adopt-dont-shop/lib-auth`

**lib.validation** - Form and data validation

- Schema validation (Zod)
- Custom validators
- Error formatting
- Package: `@adopt-dont-shop/lib-validation`

### Feature Libraries

**lib.applications** - Application management

- Application lifecycle
- Status transitions
- Timeline tracking
- Package: `@adopt-dont-shop/lib-applications`

**lib.chat** - Real-time messaging

- WebSocket communication
- Message history
- Conversation management
- Package: `@adopt-dont-shop/lib-chat`

**lib.discovery** - Pet discovery

- Swipe actions
- Smart recommendations
- Session analytics
- Package: `@adopt-dont-shop/lib-discovery`

**lib.email** - Email management

- Template system
- Queue management
- Delivery tracking
- Package: `@adopt-dont-shop/lib-email`

**lib.invitations** - Staff invitation system

- Invitation creation
- Token management
- Status tracking
- Package: `@adopt-dont-shop/lib-invitations`

**lib.notifications** - Notification system

- Multi-channel delivery
- Preference management
- Real-time alerts
- Package: `@adopt-dont-shop/lib-notifications`

**lib.pets** - Pet management

- Pet profiles
- Status tracking
- Search functionality
- Package: `@adopt-dont-shop/lib-pets`

**lib.rescues** - Rescue organization management

- Organization profiles
- Staff management
- Settings configuration
- Package: `@adopt-dont-shop/lib-rescues`

**lib.search** - Advanced search

- Filter management
- Query building
- Result ranking
- Package: `@adopt-dont-shop/lib-search`

**lib.storage** - File storage

- Upload handling
- Cloud storage integration
- CDN management
- Package: `@adopt-dont-shop/lib-storage`

**lib.users** - User management

- Profile management
- Preference handling
- Account operations
- Package: `@adopt-dont-shop/lib-users`

### Utility Libraries

**lib.analytics** - Analytics and tracking

- Event tracking
- User behavior analytics
- Report generation
- Package: `@adopt-dont-shop/lib-analytics`

**lib.common** - Common utilities

- Shared helpers
- Date/time utilities
- String formatters
- Package: `@adopt-dont-shop/lib-common`

## Quick Start

### Installation

Add to your package.json:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib-api": "workspace:*",
    "@adopt-dont-shop/lib-auth": "workspace:*"
  }
}
```

Then run:

```bash
npm install
```

### Basic Usage

```typescript
// Import from libraries
import { apiService } from '@adopt-dont-shop/lib-api';
import { authService } from '@adopt-dont-shop/lib-auth';
import { PetService } from '@adopt-dont-shop/lib-pets';

// Use services
const pets = await apiService.exampleMethod({ endpoint: '/pets' });
const user = authService.getCurrentUser();
const petService = new PetService();
```

## Development

### Building Libraries

```bash
# Build all libraries
npm run build

# Build specific library
cd lib.api && npm run build

# Watch mode
npm run dev
```

### Testing

```bash
# Test all libraries
npm test

# Test specific library
cd lib.api && npm test

# Watch mode
npm run test:watch
```

### Development Environment

```bash
# Start with Docker
cd lib.api
docker-compose -f docker-compose.lib.yml up

# Development mode
npm run dev
```

## Integration Patterns

### Backend Integration

```typescript
// service.backend/src/services/pet.service.ts
import { PetService } from '@adopt-dont-shop/lib-pets';
import { apiService } from '@adopt-dont-shop/lib-api';

export class BackendPetService extends PetService {
  async getAllPets() {
    return await apiService.exampleMethod({ endpoint: '/pets' });
  }
}
```

### Frontend Integration

```typescript
// app.client/src/hooks/usePets.ts
import { PetService } from '@adopt-dont-shop/lib-pets';
import { useQuery } from '@tanstack/react-query';

export const usePets = () => {
  const petService = new PetService();

  return useQuery({
    queryKey: ['pets'],
    queryFn: () => petService.getAllPets(),
  });
};
```

## Testing Standards

Each library includes 8 comprehensive tests:

1. Service initialization
2. Configuration validation
3. Method functionality
4. Error handling
5. Edge cases
6. Async operations
7. State management
8. Integration scenarios

## Best Practices

### Library Usage

- Import only what you need
- Use singleton instances where appropriate
- Handle errors gracefully
- Follow TypeScript type definitions

### Development

- Run tests before committing
- Update documentation for API changes
- Maintain backward compatibility
- Use semantic versioning

### Performance

- Tree-shake unused code
- Lazy load heavy libraries
- Cache service instances
- Monitor bundle sizes

## Troubleshooting

### Common Issues

**Import Errors**

```bash
# Ensure workspace dependencies installed
npm install

# Rebuild libraries
npm run build
```

**Type Errors**

```bash
# Regenerate TypeScript declarations
npm run build

# Check tsconfig.json paths
```

**Test Failures**

```bash
# Clear Jest cache
npm run test -- --clearCache

# Run tests in sequence
npm run test -- --runInBand
```

## Additional Resources

**Detailed Guides:**

- [Library Architecture](../infrastructure/MICROSERVICES-STANDARDS.md)
- [Testing Guide](../backend/testing.md)
- [API Documentation](../backend/api-endpoints.md)
- [Ecosystem Status](./ecosystem-status.md)

**Individual Library Docs:**

- [lib.api](./api.md)
- [lib.auth](./auth.md)
- [lib.applications](./applications.md)
- [lib.chat](./chat.md)
- [lib.discovery](./discovery.md)
- [lib.email](./email.md)
- [lib.invitations](./invitations.md)
- [lib.notifications](./notifications.md)
- [lib.pets](./pets.md)
- [lib.rescues](./rescues.md)
- [lib.search](./search.md)
- [lib.storage](./storage.md)
- [lib.users](./users.md)
- [lib.analytics](./analytics.md)
- [lib.common](./common.md)
- [lib.validation](./validation.md)
