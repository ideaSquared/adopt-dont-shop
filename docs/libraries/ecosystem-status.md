# Library Ecosystem Status

This page lists the 21 shared libraries defined in the root `package.json` workspaces. The authoritative source of truth for the library set is the `workspaces` field — if this document and the workspace list ever disagree, trust the workspace list.

## 📚 Library Inventory

| Library                 | Type       | Purpose                                              |
| ----------------------- | ---------- | ---------------------------------------------------- |
| **lib.api**             | Transport  | HTTP client, auth token injection, interceptors      |
| **lib.types**           | Shared     | Shared TypeScript types (consumed by backend and apps) |
| **lib.validation**      | Service    | Zod schemas and validation helpers                   |
| **lib.auth**            | Service    | Authentication hooks, session, token handling        |
| **lib.permissions**     | Service    | Role-based access control                            |
| **lib.invitations**     | Service    | Staff/user invitation tokens                         |
| **lib.applications**    | Service    | Adoption application lifecycle                       |
| **lib.chat**            | Service    | Real-time chat (WebSocket)                           |
| **lib.discovery**       | Service    | Swipe-based pet discovery                            |
| **lib.notifications**   | Service    | Multi-channel notifications                          |
| **lib.pets**            | Service    | Pet profile management                               |
| **lib.rescue**          | Service    | Rescue organization management                       |
| **lib.search**          | Service    | Search filters and query building                    |
| **lib.moderation**      | Service    | Reporting and moderation workflow                    |
| **lib.support-tickets** | Service    | Support ticket creation and tracking                 |
| **lib.audit-logs**      | Service    | Audit logging for sensitive actions                  |
| **lib.components**      | UI         | Shared React components (styled-components)          |
| **lib.analytics**       | Service    | Event tracking helpers                               |
| **lib.feature-flags**   | Service    | Feature flag evaluation                              |
| **lib.utils**           | Utility    | Formatters, date/string helpers                      |
| **lib.dev-tools**       | Utility    | Development-only tooling                             |

### Architecture Overview

**Core Transport**

- **lib.api** — HTTP transport with auth token injection and interceptors

**Authentication & Access**

- **lib.auth** — authentication hooks/context, session, token handling
- **lib.permissions** — role-based access control
- **lib.invitations** — invitation tokens

**Domain Services**

- **lib.applications**, **lib.chat**, **lib.discovery**, **lib.notifications**, **lib.pets**, **lib.rescue**, **lib.search**, **lib.moderation**, **lib.support-tickets**, **lib.audit-logs**

**UI & Analytics**

- **lib.components** — shared React components
- **lib.analytics** — event tracking
- **lib.feature-flags** — feature flag evaluation

**Utilities**

- **lib.types** — shared TypeScript types
- **lib.validation** — Zod schemas
- **lib.utils** — formatters and helpers
- **lib.dev-tools** — development tooling

### Generator Script

`scripts/create-new-lib.js` scaffolds a new library. Invoke via the root script:

```bash
npm run new-lib <name> "<description>" [--with-api]
```

The `--with-api` flag wires up a dependency on `@adopt-dont-shop/lib.api`. Review the generated `package.json` before committing — scaffolded package names may need to be aligned with the existing `lib.*` scoped naming convention used across the workspace.

### Integration Patterns

**App Integration Example**

```typescript
// app.client/src/services/index.ts
import { apiService } from '@adopt-dont-shop/lib.api';
import { authService } from '@adopt-dont-shop/lib.auth';
import { notificationsService } from '@adopt-dont-shop/lib.notifications';
import { analyticsService } from '@adopt-dont-shop/lib.analytics';

// Configure API for client app
apiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  debug: import.meta.env.DEV,
});

export { authService, notificationsService, analyticsService };
```

**Service Integration Example**

```typescript
// lib.auth integration with lib.api
import { ApiService } from '@adopt-dont-shop/lib.api';

export class AuthService {
  constructor(private apiService = new ApiService()) {
    this.apiService.updateConfig({
      getAuthToken: () => this.getToken(),
    });
  }
}
```

### Development Workflow

**Creating a new library**

1. Scaffold: `npm run new-lib <name> "<description>" [--with-api]`
2. Implement domain logic under `src/`
3. Add tests
4. Build: `npm run build`, then run tests with `npm test`

**Using libraries in apps**

1. Add to the consumer's `package.json`: `"@adopt-dont-shop/lib.<name>": "*"`
2. `npm install` at the repo root to link the workspace
3. Import from `@adopt-dont-shop/lib.<name>`
