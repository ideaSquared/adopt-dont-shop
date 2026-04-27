# @adopt-dont-shop/lib.discovery

Swipe-based pet-discovery service — fetches the discovery queue, records like/pass/super-like actions, and manages swipe sessions.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.discovery": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list. Primary entry points:

- **`DiscoveryService`** — class constructed with a `DiscoveryServiceConfig`. Methods:
  - `getDiscoveryQueue(...)` — fetch the next batch of pets to swipe
  - `loadMorePets(sessionId, lastPetId)` — append to the queue
  - `recordSwipeAction(action)` — record a like / pass / super-like
  - `getSwipeStats(userId)` — per-user swipe counts
  - `startSwipeSession(userId?, filters?)`, `endSwipeSession(sessionId)`
  - `getSessionStats(sessionId)`
- **Types** — `DiscoveryServiceConfig`, `DiscoveryServiceOptions`, plus the pet / session / action types re-exported from `./types`.
- **Constants** — endpoint paths and defaults from `./constants`.

## Quick start

```typescript
import { DiscoveryService } from '@adopt-dont-shop/lib.discovery';

const discovery = new DiscoveryService({ apiUrl: import.meta.env.VITE_API_BASE_URL });

const session = await discovery.startSwipeSession(userId, { type: 'DOG' });
const queue = await discovery.getDiscoveryQueue({ sessionId: session.sessionId });

await discovery.recordSwipeAction({
  sessionId: session.sessionId,
  petId: queue[0].petId,
  action: 'like',
});
```

## Scripts (from `lib.discovery/`)

```bash
npm run build           # tsc
npm run dev             # tsc --watch
npm test                # jest
npm run test:watch
npm run test:coverage
npm run lint
npm run type-check
```

## Resources

- Source of truth for exports: [src/index.ts](./src/index.ts)
- Service implementation: [src/services/discovery-service.ts](./src/services/discovery-service.ts)
