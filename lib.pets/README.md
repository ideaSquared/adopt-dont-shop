# @adopt-dont-shop/lib.pets

Pet data management — search, favourites, and rescue-side management (create / update / delete / media).

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.pets": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list.

- **`PetsService`** — read-side client for adopters (search, favourites, similar pets, stats)
- **`PetManagementService`** + **`petManagementService`** singleton — write-side client for rescue staff
- **Types** — `PetsServiceConfig` and everything re-exported from `./types`
- **Constants** — re-exported from `./constants` (species, status enums, etc.)

### `PetsService` methods

- `searchPets(filters?)`, `getPetById(id)`, `getFeaturedPets(limit?)`, `getRecentPets(limit?)`
- `getPetsByRescue(rescueId, page?)`, `getSimilarPets(petId, limit?)`
- `getPetBreeds(type?)`, `getPetTypes()`
- Favourites: `addToFavorites`, `removeFromFavorites`, `getFavorites`, `isFavorite`
- `reportPet(...)`, `getPetStats()`

### `PetManagementService` methods

- `createPet(data)` — see `src/services/pets-management-service.ts` for the full list of management methods

## Quick start

```typescript
import { PetsService, petManagementService } from '@adopt-dont-shop/lib.pets';

const pets = new PetsService({ apiUrl: import.meta.env.VITE_API_BASE_URL });
const { data } = await pets.searchPets({ type: 'DOG', location: 'BS1' });

// rescue-side
const pet = await petManagementService.createPet({ /* … */ });
```

## Scripts (from `lib.pets/`)

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

- Central docs: [docs/libraries/pets.md](../docs/libraries/pets.md)
- Source of truth for exports: [src/index.ts](./src/index.ts)
