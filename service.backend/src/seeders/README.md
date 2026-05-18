# Database Seeders

This directory contains comprehensive database seeders for populating the development environment with realistic test data for the Adopt Don't Shop platform.

## Overview

The seeders create a complete development environment with:

- **RBAC System**: Permissions, roles, and role-permission assignments
- **Users**: Various user types (admins, rescue staff, adopters) with realistic profiles
- **Rescue Organizations**: Multiple rescue centers with different statuses
- **Pets**: Diverse pet profiles with various statuses and detailed information
- **Applications**: Adoption applications in different workflow states
- **Communications**: Chat conversations and messages between users
- **System Data**: Feature flags, notifications, ratings, and email templates

## Quick Start

Seeders are split into three classes (reference / demo / fixtures) with
explicit composition — no "do everything" alias.

### Reference data only (idempotent, safe everywhere)

```bash
npm run db:seed:reference
```

### Demo data (dev / staging only — Faker, requires confirmation flag)

```bash
npm run db:seed:demo
```

### Test fixtures (Emily conversations, e2e accounts)

```bash
npm run db:seed:fixtures
```

### Truncate demo + fixture tables

```bash
npm run db:seed:reset
```

## Layout

Seeders are split across three subdirectories by safety profile, plus a `bootstrap/` directory for the first-run admin:

- `reference/` — idempotent reference data (RBAC permissions/roles/role-permissions, breeds, email templates). Composed by `db:seed:reference` and safe in every environment.
- `demo/` — Faker-generated demo data (additional users, rescues, pets, applications, chats, messages, ratings). Composed by `db:seed:demo` and gated on `ALLOW_DEMO_SEED=true` — never run in production.
- `fixtures/` — deterministic test fixtures (Emily conversations, the seeded API-probe accounts the e2e suite relies on). Composed by `db:seed:fixtures`.
- `bootstrap/` — first-run admin creation for fresh production environments. Invoked via `db:bootstrap` and gated on `ALLOW_BOOTSTRAP=true`.

The numbered top-level files (`04-users.ts`, `06-rescues.ts`, `08-pets.ts`, etc.) are the underlying building blocks that the demo/fixture pipelines call into; you normally run the composed `npm run db:seed:*` scripts rather than invoking them directly.

## Test Data Created

### Users

- **Super Admin**: `superadmin@adoptdontshop.dev`
- **Admin**: `admin@adoptdontshop.dev`
- **Moderator**: `moderator@adoptdontshop.dev`
- **Rescue Managers**: Various rescue organization administrators
- **Adopters**: Multiple test adopters with different experience levels

**Default Password**: `DevPassword123!`

### Pets

- **Buddy** (Golden Retriever) - Available, high energy
- **Whiskers** (Senior Cat) - Available, special needs
- **Rocky** (Senior Pit Bull Mix) - Available, gentle
- **Luna** (Siamese Mix) - Pending adoption
- **Max** (German Shepherd Mix) - Young, needs training

### Applications

- Various application states (submitted, under review, approved, rejected)
- Realistic application data with references, answers, and notes
- Different adoption scenarios and outcomes

### Rescue Organizations

- **Paws Rescue Austin** (Verified) - General rescue
- **Happy Tails Senior Dog Rescue** (Verified) - Senior dog specialist
- **Furry Friends Portland** (Pending) - Multi-species rescue

## Environment Requirements

Make sure your environment variables are set:

```env
NODE_ENV=development
DEV_DB_NAME=your_dev_database
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

## Individual Seeder Usage

You can also run individual seeders by importing and calling them:

```typescript
import { seedUsers } from './04-users';
import { seedPets } from './08-pets';

// Run specific seeders
await seedUsers();
await seedPets();
```

## Data Relationships

The seeded data maintains realistic relationships:

- Users have appropriate roles and permissions
- Pets belong to rescue organizations
- Applications connect users, pets, and rescues
- Chats relate to applications or general inquiries
- Messages populate chat conversations
- Notifications reflect system activities

## Development Tips

### Testing Different Scenarios

The seeders create data for testing various scenarios:

- **Approved applications** (Whiskers → Emily)
- **Pending applications** (Buddy → John)
- **Interview scheduled** (Rocky → Michael)
- **Rejected applications** (Luna → Jessica)

### User Login Testing

Use any of the seeded user emails with the password `DevPassword123!` to test different user types and permission levels.

### API Testing

The seeded data provides realistic test cases for:

- Pet search and filtering
- Application workflows
- Chat functionality
- Rating systems
- Email template testing

## Adding New Seeders

To add a new seeder:

1. Create a new file: `XX-name.ts`
2. Export a function: `export async function seedName()`
3. Add it to `index.ts` in the seeders array
4. Update the clear order if needed

## Troubleshooting

### Foreign Key Errors

If you get foreign key constraint errors:

1. Run `npm run db:seed:reset` first
2. Ensure database migrations are up to date (`npm run db:migrate`)
3. Re-seed in order: `npm run db:seed:reference && npm run db:seed:demo && npm run db:seed:fixtures`

### Performance

The seeders use `findOrCreate` to avoid duplicates, so they're safe to run multiple times. Initial seeding typically takes 10-30 seconds depending on your database.

### Stale `CONSENT_RECORDED` rows after pulling main

The user seeder writes a `CONSENT_RECORDED` audit row per seeded account, and that row now carries `cookiesVersion` and `analyticsConsent` fields (added with the cookies banner work). Because the seeder is idempotent — it skips users whose audit row already exists — running the demo/fixture seeders again is **not** enough to backfill those fields on a dev DB seeded before that change. The visible symptom is the cookies banner / re-acceptance modal showing for every seeded login. Wipe and re-seed the dev DB (`npm run db:reset`) to pick up the current consent fields.

## Production Safety

⚠️ **Important**: These seeders are designed for development only. Do not run in production environments. The clear function truncates tables and should never be used with production data.
