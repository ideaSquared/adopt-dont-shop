# @adopt-dont-shop/lib.validation

Canonical Zod schemas for the User, Pet, Rescue, and Application domains — used by the backend (request validation + Sequelize beforeValidate cross-checks) and the frontend (forms via `lib.auth` etc.).

The canonical, code-verified reference lives next to the source:

> **[lib.validation/README.md](../../lib.validation/README.md)**

It covers exports (`UserSchema`, `PetSchema`, `RescueSchema`, `ApplicationSchema` and their inferred types), how schemas align with the Sequelize column-level validators, and the `ValidationService` placeholder.

## See also

- [`@adopt-dont-shop/lib.types`](../../lib.types/README.md) — branded ID types referenced by the schemas
- [Backend implementation guide](../backend/implementation-guide.md) — how the schemas are wired into route validation
