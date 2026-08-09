/**
 * Boot vs. on-demand seeding mode.
 *
 * A fresh dev database should come up already populated, but an existing one
 * must NOT be re-seeded from under the developer on every container boot. So
 * the compose boot command sets SEED_ONLY_IF_EMPTY=true: the seeder then plants
 * data only when its anchor row (the deterministic index-0 id) is absent, and
 * no-ops otherwise. The manual `pnpm db:seed:dev` command leaves the flag unset,
 * so running it is the developer explicitly choosing to (re)populate.
 */

export const seedOnlyIfEmpty = (): boolean => process.env.SEED_ONLY_IF_EMPTY === 'true';
