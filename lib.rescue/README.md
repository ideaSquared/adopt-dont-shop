# @adopt-dont-shop/lib.rescue

Rescue-organisation data client — profiles, pet listings, adoption policies, and search.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.rescue": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list.

- **`RescueService`** — class client
- **`rescueService`** — ready-to-use singleton
- **Types** — `Rescue`, `RescueAPIResponse`, `RescueSearchFilters`, `RescueStatus`, `RescueType`, `RescueLocation`, `Pet`, `PaginatedResponse`, `Pagination`, `RescueServiceConfig`, `RescueServiceOptions`
- **Constants** — re-exported from `./constants`

### Key methods

- `getRescue(rescueId)`
- `searchRescues(filters?)`, `getAllRescues()`, `getFeaturedRescues(limit?)`
- `getPetsByRescue(rescueId, options?)`
- Adoption policies: `getAdoptionPolicies(rescueId)`, `updateAdoptionPolicies(rescueId, policy)`

## Quick start

```typescript
import { rescueService } from '@adopt-dont-shop/lib.rescue';

const rescue = await rescueService.getRescue(rescueId);
const { data } = await rescueService.searchRescues({ type: 'CHARITY', location: 'Manchester' });
```

## Scripts (from `lib.rescue/`)

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
