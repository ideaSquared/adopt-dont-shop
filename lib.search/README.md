# @adopt-dont-shop/lib.search

Cross-domain search client — pets, messages, faceted search, and suggestions.

Consumed as a workspace dependency:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.search": "*"
  }
}
```

## Exports

See [src/index.ts](./src/index.ts) for the authoritative list.

- **`SearchService`** — class client
- **Types** — `SearchServiceConfig`, `SearchServiceOptions`, plus domain types re-exported from `./types`

### Key methods

- `searchPets(query, options?)` — text + filter search for pets
- `searchMessages(query, options?)` — message / chat search
- `getSearchSuggestions(query, options?)` — typeahead suggestions
- `facetedSearch(query, options?)` — multi-facet search across entities

## Quick start

```typescript
import { SearchService } from '@adopt-dont-shop/lib.search';

const search = new SearchService({ apiUrl: import.meta.env.VITE_API_BASE_URL });

const pets = await search.searchPets('golden retriever', { location: 'BS1' });
const suggestions = await search.getSearchSuggestions('gold');
```

## Scripts (from `lib.search/`)

```bash
npm run build           # tsc
npm run dev             # tsc --watch
npm test                # vitest run
npm run test:watch
npm run test:coverage
npm run lint
npm run type-check
```

## Resources

- Source of truth for exports: [src/index.ts](./src/index.ts)
