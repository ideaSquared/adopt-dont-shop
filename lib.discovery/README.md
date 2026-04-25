# @adopt-dont-shop/lib.discovery

Swipe-based pet discovery client for the Adopt Don't Shop apps. Wraps the discovery API: queueing pets, recording swipe actions, fetching session stats, and starting / ending swipe sessions.

For the wider library catalogue see [`docs/libraries/discovery.md`](../docs/libraries/discovery.md). This README is the source of truth for what `lib.discovery` exports today.

## Installation

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.discovery": "*"
  }
}
```

Run `npm install` at the repo root to link the workspace.

## Public Exports

From [`lib.discovery/src/index.ts`](./src/index.ts):

- `DiscoveryService` — class
- `DiscoveryServiceConfig`, `DiscoveryServiceOptions` — configuration / call-site option types
- All shared types from `./types`
- All constants from `./constants`

There is no top-level `discoveryService` singleton — instantiate `DiscoveryService` yourself.

## Real Method Surface

From [`lib.discovery/src/services/discovery-service.ts`](./src/services/discovery-service.ts):

- `getDiscoveryQueue(options)` — fetch the next batch of pets for a user
- `recordSwipeAction(action)` — submit a swipe (like / pass / super-like)
- `getSwipeStats(userId)` — analytics for a user's swipes
- `loadMorePets(sessionId, lastPetId)` — paginate within an active session
- `getSessionStats(sessionId)` — stats for a single swipe session
- `startSwipeSession(userId?, filters?)` — begin a new swipe session
- `endSwipeSession(sessionId)` — close a swipe session

## Quick Start

```typescript
import { DiscoveryService } from '@adopt-dont-shop/lib.discovery';

const discovery = new DiscoveryService({
  apiUrl: import.meta.env.VITE_API_BASE_URL,
});

const session = await discovery.startSwipeSession(currentUser.id, { type: 'dog' });
const queue = await discovery.getDiscoveryQueue({ sessionId: session.id, limit: 20 });

await discovery.recordSwipeAction({
  sessionId: session.id,
  petId: queue[0].id,
  action: 'like',
});
```

## Development

```bash
npx turbo build --filter=@adopt-dont-shop/lib.discovery
npx turbo test  --filter=@adopt-dont-shop/lib.discovery
npx turbo lint  --filter=@adopt-dont-shop/lib.discovery
```
