# Dev seed data and test accounts

How to populate a local dev stack with data and log in to each app. For developers running `pnpm docker:dev`; it is not for staging or production (the seeders refuse to run there).

## What gets seeded

Two tiers, both idempotent (re-running converges on the same rows):

| Tier                                  | Command            | What it plants                                                                                                                                                                              |
| ------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixed personas (`scripts/seed.mjs`)   | `pnpm db:seed`     | 9 named users, 2 verified rescues (Paws Rescue, Happy Tails Rescue) with staff, 4 pets (Buddy, Luna, Max, Bella), John Smith's favourites, an under-review application and an enquiry chat. |
| Synthetic volume (`scripts/spam.mjs`) | `pnpm db:spam`     | Faker-generated adopters, staff, rescues, pets, ratings, applications, chats, messages and notifications so the apps look populated.                                                        |
| Both                                  | `pnpm db:seed:dev` | `db:seed` then `db:spam`.                                                                                                                                                                   |

**The personas are generated through the API.** `scripts/seed.mjs` signs in to the gateway and creates everything the way a real user would: the super_admin creates the admins and rescues, staff join by accepting their rescue's invitation, adopters register and verify their email, staff list pets and move them through the status machine, John applies and the rescue starts the review. Because it goes through validation, permission checks and domain events, the seed cannot drift from what the API accepts. The data lives in `scripts/lib/seed-personas.mjs`; the steps are in `scripts/lib/seed-generate.mjs`. The API assigns every id, so nothing depends on a fixed one: e2e looks the pets up by name (`e2e/helpers/seeds.ts`).

Only two things are still written with SQL, because no API can create them: the bootstrap super_admin (`services/auth` `db:seed`; creating any admin through the API needs an admin) and the breed reference list (`services/pets` `db:seed`).

Sign-ups and invitations are completed with the gateway's test-only token-peek routes (`/api/v1/test/*`), so the gateway must run with `E2E_TOKEN_PEEK=true`. `docker-compose.dev.yml` defaults it on, along with higher gateway rate limits for the seed's burst of logins.

The synthetic tier is still SQL (`services/<name>/src/db/spam.ts`) because it needs volume and backdated history the API cannot produce. `scripts/spam.mjs` runs it with `docker compose exec` in dependency order: **auth → rescue → pets → applications → chat → notifications**.

**A fresh stack seeds itself.** On boot, `service-auth` and `service-pets` run their SQL `db:seed`, auth, pets and rescue run `db:spam` (with `SEED_ONLY_IF_EMPTY=true`), and the one-shot `seed-personas` container runs `scripts/seed.mjs --api-only` once the services are healthy. You only need the commands below to re-seed after an e2e run has changed the data, to add the applications/chat/notifications spam tier, or to raise the volume.

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

   Expected (per-service logger lines and most persona lines omitted). `+` means created, `=` means it already existed:

   ```
   → bootstrapping super_admin (service-auth)...
   → bootstrapping breed reference data (service-pets)...

   → generating personas through the API (http://localhost:4000)...
   admins
     + admin@adoptdontshop.dev (admin)
   …
   chats
     + chat john.smith@gmail.com → Buddy (4 messages)

   ✓ seed complete — login as john.smith@gmail.com / DevPassword123! (or your SEED_PASSWORD)
   ```

   If it fails with `failed to exec into service-auth … Is the stack running?`, the containers are not up — go back to step 1. If it says the token-peek seam is off, the gateway was started with `E2E_TOKEN_PEEK` set to something other than `true` in `.env`.

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

   Source of truth: `scripts/lib/seed-personas.mjs` (the super_admin is in `services/auth/src/db/seed-data.ts`). The Playwright suite logs in as the first row of each app (`e2e/fixtures/roles.ts`).

5. Start over.

   ```bash
   pnpm docker:reset      # stops containers and wipes volumes, including the DB
   pnpm docker:dev:detach # re-migrates and re-seeds on boot
   ```

## Knobs

| Variable                                                                                                                                             | Default                                                                          | Effect                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `SEED_PASSWORD`                                                                                                                                      | `DevPassword123!`                                                                | Password for every fixed persona. `pnpm db:seed` reads it from your shell; the containers use the default. |
| `SEED_API_URL`                                                                                                                                       | `http://localhost:4000`                                                          | Gateway the persona generator (`scripts/seed.mjs`) talks to.                                               |
| `SPAM_PASSWORD`                                                                                                                                      | `DevPassword123!`                                                                | Password for every synthetic user (`services/auth/src/db/spam.ts`).                                        |
| `SPAM_ADOPTERS`, `SPAM_STAFF`, `SPAM_RESCUES`, `SPAM_PETS`, `SPAM_RATINGS`, `SPAM_APPLICATIONS`, `SPAM_CHATS`, `SPAM_MESSAGES`, `SPAM_NOTIFICATIONS` | per service (e.g. applications 400, chats 150, messages 2000, notifications 800) | Row counts; forwarded from your shell into the containers by `scripts/spam.mjs`.                           |
| `FAKER_SEED`                                                                                                                                         | `42`                                                                             | Faker RNG seed, so generated names/text are deterministic.                                                 |
| `SEED_DOCKER`                                                                                                                                        | `docker`                                                                         | Docker binary the orchestrators shell out to.                                                              |

Full variable reference: [docs/env-reference.md](../env-reference.md#seed-data-devtest-only).
