# Sequelize 7 — Decorator Migration POC

**Linear**: ADS-531 / Stage 3 §11 follow-up
**Status**: Negative result — blocked on dependency version
**Author**: Investigation only; no source changes landed.

## TL;DR

**Decorators are not usable on the pinned Sequelize version.** `sequelize@7.0.0-alpha.9`
(the project's current pin) ships **no decorator API**. The decorator surface
(`@Table`, `@Attribute`, `@HasMany`, `@BelongsTo`, etc.) only exists in
**`@sequelize/core`** — a renamed package that starts at version `7.0.0-alpha.10`.
The two are distinct npm packages (`sequelize` vs `@sequelize/core`), not
just version numbers on the same package.

Doing the §11 decorator migration therefore requires the rename + version
bump first; it cannot be a standalone Stage 3 cleanup on top of the current
pin.

The intended POC (migrate `Breed` end-to-end and verify build + 2,200+
tests stay green) was not executed because the prerequisite import paths
do not exist in `node_modules/sequelize`. No model files were modified.

## How this was verified

1. **Inspected the installed package.** After `npm install`, the on-disk
   layout of `node_modules/sequelize@7.0.0-alpha.9` has no decorator
   modules:

   ```bash
   $ ls node_modules/sequelize/types
   associations  data-types.d.ts  deferrable.d.ts  dialects  errors
   generic  hooks.d.ts  index-hints.d.ts  index.d.ts  instance-validator.d.ts
   model-manager.d.ts  model.d.ts  operators.d.ts  query-types.d.ts
   sequelize.d.ts  sql-string.d.ts  table-hints.d.ts  transaction.d.ts
   utils  utils.d.ts

   $ find node_modules/sequelize -iname '*decorator*'
   # (empty)

   $ grep -r 'decorator\|@Attribute\|@Table' node_modules/sequelize/lib node_modules/sequelize/types
   # (empty)
   ```

2. **Checked the package's `exports` map.** Only `.`, `./lib/*`, and
   `./lib/errors` are exported. There is no `decorators-legacy` subpath,
   and `./*` doesn't help because there is no corresponding file on disk.

3. **Confirmed via the npm registry.** Of the 7.x versions published
   under the original `sequelize` package name —
   `7.0.0-alpha.1` … `7.0.0-alpha.9`, `7.0.0-alpha2.1`, `7.0.0-alpha2.2`,
   `7.0.0-next.1` — none contain decorator code (I downloaded
   `7.0.0-alpha2.2` and re-checked its tarball — same story). The
   `alpha` dist-tag on `sequelize` is still pinned to `7.0.0-alpha.9`.

4. **Located the actual decorator-bearing package.** Decorator support
   ships under `@sequelize/core` (a renamed/forked release line),
   starting at `@sequelize/core@7.0.0-alpha.10` and current at
   `@sequelize/core@7.0.0-alpha.48`. Migrating to decorators means
   adopting that package — i.e. a Sequelize bump, not just a refactor.

## Why this matters for the migration plan

`docs/upgrades/sequelize-7-migration.md` Stage 3 §11 ("Migrate models
to decorator-based class definitions, 5–10 dev-days") is gated on the
Stage 1 + 2 work being done **against `@sequelize/core`**, not against
the `sequelize` package the project currently pulls in. Concretely:

- The Stage 1/2 bump cannot stop at `sequelize@7.0.0-alpha.9`. To get
  decorators on the table at all, Stage 1 has to follow the `sequelize`
  → `@sequelize/core` rename. All 120 import sites that currently say
  `from 'sequelize'` will need to be retargeted to `from '@sequelize/core'`.
- That rename also changes the dialect packaging (Postgres / SQLite move
  to their own `@sequelize/postgres` / `@sequelize/sqlite3` packages),
  which is the change the migration plan already flags under "Dialect-
  package split" — it just now happens earlier.

The hard constraint in this task ("don't bump Sequelize") therefore
makes the POC unachievable in its intended shape. The valuable output
is the dependency finding above plus the prep work below.

## What the POC *would* have looked like

Even though the migration can't land today, the team will want a concrete
template when it does. The plan below is what I would execute the
moment the Sequelize bump is in place.

### Target model

**`Breed`** (`service.backend/src/models/Breed.ts`) is the right POC
target:

- 3 declared attributes + 2 audit columns — exercises columns, ENUM,
  and the `auditColumns` spread.
- `paranoid: false` opt-out from the project default — exercises the
  paranoid override path explicitly.
- One association edge (`Pet.belongsTo(Breed)` twice, with no reverse
  `Breed.hasMany`) — small enough to convert in isolation, but real
  enough to verify the `@BelongsTo` decorator round-trips.
- Covered indirectly by pet flows (breed lookup, breed filter, breed-
  popularity stats) so a regression would surface in the existing suite
  without writing new tests.

`Address` is the runner-up but is heavier (polymorphic FK + partial
unique index + custom validator), which makes for a noisier first PR.

### Expected before/after

**Before** (today, simplified):

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize, { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { auditColumns, auditIndexes, withAuditHooks } from './audit-columns';
import { PetType } from './Pet';

interface BreedAttributes {
  breed_id: string;
  species: PetType;
  name: string;
  created_at?: Date;
  updated_at?: Date;
}

interface BreedCreationAttributes
  extends Optional<BreedAttributes, 'breed_id' | 'created_at' | 'updated_at'> {}

export class Breed
  extends Model<BreedAttributes, BreedCreationAttributes>
  implements BreedAttributes
{
  public breed_id!: string;
  public species!: PetType;
  public name!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Breed.init(
  {
    breed_id: {
      type: getUuidType(),
      primaryKey: true,
      defaultValue: () => generateUuidV7(),
    },
    species: { type: DataTypes.ENUM(...Object.values(PetType)), allowNull: false },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 128] },
    },
    ...auditColumns,
  },
  withAuditHooks({
    sequelize,
    modelName: 'Breed',
    tableName: 'breeds',
    timestamps: true,
    paranoid: false,
    underscored: true,
    indexes: [
      { fields: ['species', 'name'], name: 'breeds_species_name_unique', unique: true },
      { fields: ['name'], name: 'breeds_name_idx' },
      ...auditIndexes('breeds'),
    ],
  })
);
```

**After** (target, against `@sequelize/core` ≥ alpha.10):

```typescript
import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from '@sequelize/core';
import {
  Attribute,
  Default,
  NotNull,
  PrimaryKey,
  Table,
  Index,
  CreatedAt,
  UpdatedAt,
} from '@sequelize/core/decorators-legacy';
import { DataTypes } from '@sequelize/core';

import { getUuidType } from '../sequelize';
import { generateUuidV7 } from '../utils/uuid';
import { withAuditHooks } from './audit-columns';
import { PetType } from './Pet';

@Table({
  tableName: 'breeds',
  timestamps: true,
  paranoid: false,
  underscored: true,
})
@Index({ fields: ['species', 'name'], name: 'breeds_species_name_unique', unique: true })
@Index({ fields: ['name'], name: 'breeds_name_idx' })
export class Breed extends Model<
  InferAttributes<Breed>,
  InferCreationAttributes<Breed>
> {
  @PrimaryKey
  @Attribute(getUuidType())
  @Default(() => generateUuidV7())
  declare breed_id: CreationOptional<string>;

  @Attribute(DataTypes.ENUM(...Object.values(PetType)))
  @NotNull
  declare species: PetType;

  @Attribute(DataTypes.STRING(128))
  @NotNull
  // validate: { notEmpty: true, len: [1, 128] } — see "Validators" gotcha below
  declare name: string;

  @CreatedAt
  declare created_at: CreationOptional<Date>;

  @UpdatedAt
  declare updated_at: CreationOptional<Date>;
}

// audit columns + hooks still attach the same way — withAuditHooks
// needs to be reshaped into a class-decorator OR a post-definition
// register call. See "Audit columns" gotcha.
```

The reverse Pet → Breed edges live on `Pet` (`@BelongsTo(() => Breed, 'breed_id')` and `@BelongsTo(() => Breed, 'secondary_breed_id')`).
Because Breed has no `hasMany` side, the `service.backend/src/models/index.ts`
block for breeds can be deleted outright once `Pet` is also migrated.
Until then, **leave the two `Pet.belongsTo(Breed, …)` lines in
`index.ts` untouched** — converting only Breed doesn't let you remove
them, since `belongsTo` is owned by the child side. This is the most
common ordering pitfall in the bulk migration: every edge has to be
migrated from the **child** side first, with the parent's `index.ts`
entry deleted only when the child is also decorated.

### Project-specific gotchas

These are the things the bulk migration will trip over. They are why
this POC is worth doing once before scheduling the rest of the work.

1. **`auditColumns` / `auditIndexes` / `withAuditHooks`**
   `audit-columns.ts` currently exposes a spread of column definitions
   (`...auditColumns`) plus an `withAuditHooks(options)` wrapper that
   returns model-init options and registers `beforeCreate` /
   `beforeUpdate` hooks. Decorators don't accept a spread, so this
   helper has to be reshaped:
   - Either turn each audit field into its own decorator (`@CreatedBy`,
     `@UpdatedBy`, `@CreatedAt`, `@UpdatedAt`, `@DeletedAt`) and a
     class-level `@Hook` set.
   - Or keep `withAuditHooks` as a post-definition register: call
     `applyAuditHooks(Breed)` once at module bottom.
   The second option is less invasive and preserves the existing
   helper's logic verbatim. **Recommend it for the bulk PR.**

2. **`getUuidType()` dialect switch**
   `getUuidType()` returns `DataTypes.UUID` on Postgres and
   `DataTypes.STRING(36)` on SQLite (the test target). The decorator
   form `@Attribute(getUuidType())` evaluates the helper at class-
   definition time, **before** the Sequelize instance has been wired
   to a dialect in some test setups. Verify by running the SQLite test
   suite specifically — if column types come out wrong, switch to a
   thunked form (`@Attribute(() => getUuidType())`) once the upstream
   decorator API supports it (alpha.40+ does, alpha.10 may not).

3. **`validate: { notEmpty, len, is, ... }` blocks**
   These don't have a 1:1 decorator. `@sequelize/core/decorators-legacy`
   ships `@ValidateAttribute({ ... })` which accepts the same object;
   the line-noise just moves. Verify each validator survives the
   conversion — the Address `is: /^[A-Z]{2}$/` regex and the model-level
   `validate.ownerTypeIsKnown` custom validator are the two non-trivial
   cases in the codebase.

4. **`paranoid` global default**
   The project sets `paranoid: true` as a global default via the
   `Sequelize` constructor options; individual models opt out (Breed
   does). Decorators inherit the global default the same way, so this
   keeps working — but the test that asserts deleted_at exists on
   models *should* run unchanged. Verify by running the existing
   paranoid suite first.

5. **Multi-tenant rescue scoping**
   The codebase uses Sequelize scopes (`Pet.scope('byRescue', rescueId)`)
   for tenant isolation. Scopes have a decorator form
   (`@Scopes({ byRescue: rescueId => ({ where: { rescue_id: rescueId } }) })`)
   — but the rescue-scoping is on `Pet` and `Application`, not on
   `Breed`, so the POC doesn't exercise it. **Pick `Application` (heavy
   tenant scoping) as the SECOND POC** before signing off the pattern
   for the bulk PR.

6. **Composite associations on `index.ts`**
   `service.backend/src/models/index.ts` is a 700-line wall of
   association declarations wrapped in a `try / catch` that swallows
   errors when `NODE_ENV === 'test'` (re-registration on hot reload).
   When migrating each model, you have to:
   - Move that model's *child-side* associations (`belongsTo`,
     `belongsToMany`) onto the class with `@BelongsTo` / `@BelongsToMany`.
   - **Leave the parent-side `hasMany` lines in `index.ts`** until the
     parent is migrated too — `@HasMany` on the parent class is the
     correct destination, but registering it both there and in
     `index.ts` produces duplicate-association errors that the try/catch
     swallows silently in tests but throws in production.
   - The duplicate-association swallowing is a **landmine**: a partial
     migration can pass tests but blow up at boot. Add a non-test
     smoke that re-imports `models/index.ts` and asserts each model has
     the expected number of associations.

7. **`sequelize-cli` migrations and seeders**
   The 10 migration files and 53 seeder files use the imperative
   `queryInterface` API and don't touch model definitions. They are
   unaffected by the decorator migration — call this out in the PR
   description so reviewers don't go looking.

8. **Status-transition trigger denormalisation**
   `ApplicationStatusTransition.ts` installs a Postgres trigger that
   denormalises `to_status` onto `applications.status`. The trigger is
   declared in a `sequelize.afterSync` hook attached at module load.
   Moving this model to decorators is fine, but the hook registration
   has to move with it — same reshape decision as `withAuditHooks`.
   `Application`, `Pet`, `HomeVisit`, `Report` all have the same
   shape; if the decorator-form of the hook works for one it works for
   all.

### Effort projection

If the prerequisite Sequelize bump is done, then **based on the
exercise of writing the Breed before/after side-by-side**:

| Class of model | Count (rough) | Per-model effort | Why |
| --- | --- | --- | --- |
| Lookup tables (Breed, Permission, EmailTemplate skeletons, …) | ~10 | **15–30 min** | Few columns, no scopes, simple FKs. |
| Standard entities (Address, Rating, Invitation, Notification, …) | ~30 | **30–60 min** | One or two associations + audit columns + validators. |
| Tenant-scoped + paranoid + multi-association entities (Pet, Application, Chat, Message, Rescue, …) | ~20 | **1–2 hr** | Multiple scopes, polymorphic FKs, status triggers, RBAC interactions. |
| Auth-path models (User, RefreshToken, RevokedToken, Role, RolePermission, UserRole, Permission, FieldPermission) | ~8 | **2–4 hr** | Critical-path test surface + RBAC `belongsToMany` plumbing + the User model has many hooks (afterCreate auto-seeds prefs rows). Last to migrate, paired with extra reviewer scrutiny. |

Plus fixed overhead:

- Reshape `withAuditHooks` into a registerable helper: **0.5–1 day**.
- Replace the `index.ts` try/catch with a deterministic registry that
  errors on duplicates (the landmine from gotcha #6): **0.5 day**.
- Add a smoke test that re-imports the model registry and asserts the
  association graph hash matches a checked-in snapshot: **0.5 day**.

**Total: 8–14 dev-days** — broader than the migration plan's
`5–10 dev-days` estimate, mostly because the audit-columns helper and
the index.ts cleanup hadn't been priced in. Stage 3 §11's estimate
should be widened accordingly.

### Recommended migration order (bulk PR sequence)

Convert in dependency-leaf-first order so the `index.ts` parent-side
deletions happen on the very last step, never partway through:

1. **Reshape `withAuditHooks` and `audit-columns.ts`** to support both
   call patterns (legacy `Model.init` and new decorator-class). Land
   as its own PR — it's a no-op refactor.
2. **Lookup tables first** — `Breed`, `Permission`, `EmailTemplate`
   (skeleton), `IpRule`, `FieldPermission`. These have at most one
   child edge; their `index.ts` parent lines vanish only when the
   child is also migrated.
3. **Leaf children of lookups** — `Pet` (FK to Breed), `RolePermission`,
   `UserRole`. Migrate together with their lookup parent's `index.ts`
   lines so the deletion is atomic.
4. **Standard entities** — Address, Rating, Invitation, Notification,
   StaffMember, SupportTicket(+Response), HomeVisit(+Transition),
   Report(+Transition+Sanction+Evidence+ModeratorAction), Content,
   NavigationMenu, Analytics-reports cluster.
5. **Tenant-scoped + heavy** — Application(+everything attached),
   Chat(+Participant+Message+Reaction+Read), Rescue(+Settings), Pet
   (full).
6. **Auth path LAST** — User, RefreshToken, RevokedToken, Role.
   Migrate these only after every other model has been through. The
   User model's `afterCreate` hooks (auto-seed NotificationPrefs /
   PrivacyPrefs / ApplicationPrefs / EmailPreference) are the highest-
   risk surface.

Each step is its own PR with the full test suite green. Land 2–3 per
day at the pace projected above; the work parallelises poorly because
every PR touches `index.ts`.

## Decision

**Do not start §11 against the current pin.** Either:

1. Fold §11 into the Stage 1/2 work that bumps to `@sequelize/core`, or
2. Land Stage 1/2 first, defer §11 as a clean follow-up under
   `@sequelize/core` once the bump is verified in production.

Option 2 is consistent with the existing migration plan and is the
safer of the two. The plan document
(`docs/upgrades/sequelize-7-migration.md`) should be updated to clarify
that the §11 work depends on the `sequelize` → `@sequelize/core`
package rename, not just on the version number.

## Pitfalls found (summary)

- `sequelize@7.0.0-alpha.9` and `@sequelize/core` are different
  packages. The decorator API only exists on the latter. (**Blocker**.)
- `audit-columns.ts` uses a spread-into-init-options pattern that
  doesn't translate to decorators without a helper reshape.
- `service.backend/src/models/index.ts` swallows duplicate-association
  errors under `NODE_ENV === 'test'`; a half-migrated state can pass
  tests and break at production boot. Replace with a strict registry.
- Every association edge has to be deleted from `index.ts` only when
  **both** endpoints are decorated; do leaves first and parents last.
- `getUuidType()` is dialect-dependent and evaluated eagerly at
  class-definition time — verify SQLite test target after the
  conversion of any model that uses it.
- Custom model-level `validate.<name>(this)` functions (e.g.
  `Address.ownerTypeIsKnown`) survive via `@ValidateAttribute` on
  recent `@sequelize/core` alphas, but the API has shifted across
  alpha releases; pin the version before the bulk PR.
