# @adopt-dont-shop/lib.pets

Pet data management. Splits cleanly into two services:

- **`PetsService`** — read-side client used by adopters (search, favourites, similar pets, breeds/types lookups).
- **`PetManagementService`** — write-side client used by rescue staff (create / update / delete, media, status, bulk operations, statistics).

The canonical, code-verified reference lives next to the source:

> **[lib.pets/README.md](../../lib.pets/README.md)**

It covers the full method surface for both services and the exported types/constants.

## See also

- [`@adopt-dont-shop/lib.search`](../../lib.search/README.md) — discovery-style filtering on top of pet data
- [`@adopt-dont-shop/lib.applications`](../../lib.applications/README.md) — adoption application flow
- [`@adopt-dont-shop/lib.rescue`](../../lib.rescue/README.md) — rescue ownership / staff context
