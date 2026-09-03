# Dev seed data and test accounts

How to populate a local dev stack with data and log in to each app. For developers running `pnpm docker:dev`; it is not for staging or production (the seeders refuse to run there).

## What gets seeded

Two tiers, both idempotent (re-running converges on the same rows):

| Tier                                  | Command            | What it plants                                                                                                                                                  |
| ------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixed personas (`scripts/seed.mjs`)   | `pnpm db:seed`     | 9 named users, 2 rescues (Paws Rescue, Happy Tails Rescue) with staff links, a small pet catalogue (Buddy, Luna, Max, Bella, …), sample applications and chats. |
| Synthetic volume (`scripts/spam.mjs`) | `pnpm db:spam`     | Faker-generated adopters, staff, rescues, pets, ratings, applications, chats, messages and notifications so the apps look populated.                            |
| Both                                  | `pnpm db:seed:dev` | `db:seed` then `db:spam`.                                                                                                                                       |

Both scripts are host-side orchestrators: they `docker compose exec` into each service container in dependency order — **auth → rescue → pets → applications → chat** (spam adds **notifications**) — and run that service's `db:seed` / `db:spam` script (`services/<name>/src/db/seed.ts`, `spam.ts`). The stack must be running.

**A fresh stack seeds itself.** `docker-compose.dev.yml` runs `db:migrate → db:seed → db:spam` (with `SEED_ONLY_IF_EMPTY=true`) for auth, pets and rescue, and `db:migrate → db:seed` for applications and chat, every time those containers start. You only need the commands below to re-seed after `pnpm docker:reset`, to add the applications/chat/notifications spam tier, or to raise the volume.

## Steps

1. Start the stack and wait for the gateway to be healthy.

   ```bash
   pnpm docker:dev:detach
   curl -fsS http://localhost:4000/health/simple
   ```

   Expected: `curl` prints a small JSON body and exits 0.

2. Plant the fixed personas.

   ```bash
   pnpm db:seed
   ```

   Expected (per-service logger lines omitted):

   ```
   → seeding auth users (personas) (service-auth)...
   → seeding rescues + staff (service-rescue)...
   → seeding pet catalogue (service-pets)...
   → seeding application read-model (references user/pet/rescue ids) (service-applications)...
   → seeding adopter↔rescue chat + participants (references user/rescue ids) (service-chat)...

   ✓ seed complete — login as john.smith@gmail.com / DevPassword123!
   ```

   If it fails with `failed to exec into service-auth … Is the stack running?`, the containers are not up — go back to step 1.

3. (Optional) Add synthetic volume.

   ```bash
   pnpm db:spam                 # defaults
   SPAM_PETS=1000 pnpm db:spam  # raise one entity's count; existing rows are untouched
   ```

   Expected: one `→ spamming …` line per service, then

   ```
   ✓ synthetic data seeded — dev database populated.
     Log in as any synthetic user: adopter0@example.test / staff0@example.test — DevPassword123!
   ```

   The spam seeders are double-gated (`packages/seed-faker/src/env-guard.ts`): `NODE_ENV` must be `development` or `test` **and** `ALLOW_SPAM=true` — `scripts/spam.mjs` passes both into the container for you.

4. Log in. Every persona uses `SEED_PASSWORD` from `.env` (`DevPassword123!` in `.env.example`).

   | App    | URL                   | Email                           | Role         |
   | ------ | --------------------- | ------------------------------- | ------------ |
   | Client | http://localhost:3000 | `john.smith@gmail.com`          | adopter      |
   | Client | http://localhost:3000 | `emily.davis@yahoo.com`         | adopter      |
   | Client | http://localhost:3000 | `michael.brown@outlook.com`     | adopter      |
   | Rescue | http://localhost:3002 | `rescue.manager@pawsrescue.dev` | rescue staff |
   | Rescue | http://localhost:3002 | `sarah.johnson@pawsrescue.dev`  | rescue staff |
   | Rescue | http://localhost:3002 | `maria@happytailsrescue.dev`    | rescue staff |
   | Admin  | http://localhost:3001 | `superadmin@adoptdontshop.dev`  | super_admin  |
   | Admin  | http://localhost:3001 | `admin@adoptdontshop.dev`       | admin        |
   | Admin  | http://localhost:3001 | `moderator@adoptdontshop.dev`   | moderator    |

   Source of truth: `services/auth/src/db/seed-data.ts` (user ids are fixed so the other services' seeds can reference them). The Playwright suite logs in as the first row of each app (`e2e/fixtures/roles.ts`).

5. Start over.

   ```bash
   pnpm docker:reset      # stops containers and wipes volumes, including the DB
   pnpm docker:dev:detach # re-migrates and re-seeds on boot
   ```

## Knobs

| Variable                                                                                                                                             | Default                                                                          | Effect                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `SEED_PASSWORD`                                                                                                                                      | `DevPassword123!`                                                                | Password for every fixed persona (`services/auth/src/db/seed-data.ts`). Set in `.env`. |
| `SPAM_PASSWORD`                                                                                                                                      | `DevPassword123!`                                                                | Password for every synthetic user (`services/auth/src/db/spam.ts`).                    |
| `SPAM_ADOPTERS`, `SPAM_STAFF`, `SPAM_RESCUES`, `SPAM_PETS`, `SPAM_RATINGS`, `SPAM_APPLICATIONS`, `SPAM_CHATS`, `SPAM_MESSAGES`, `SPAM_NOTIFICATIONS` | per service (e.g. applications 400, chats 150, messages 2000, notifications 800) | Row counts; forwarded from your shell into the containers by `scripts/spam.mjs`.       |
| `FAKER_SEED`                                                                                                                                         | `42`                                                                             | Faker RNG seed, so generated names/text are deterministic.                             |
| `SEED_DOCKER`                                                                                                                                        | `docker`                                                                         | Docker binary the orchestrators shell out to.                                          |

Full variable reference: [docs/env-reference.md](../env-reference.md#seed-data-devtest-only).
