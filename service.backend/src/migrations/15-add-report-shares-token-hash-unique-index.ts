import type { QueryInterface } from 'sequelize';
import { createIndexConcurrently, dropIndexConcurrently } from './_helpers';

/**
 * ADS-505: Promote `report_shares.token_hash` from a plain index to a
 * partial UNIQUE index.
 *
 * `token_hash` stores `sha256(share-jwt-jti)` for token-based shares. Two
 * rows with the same hash would resolve the same signed share to two
 * different rows — a hash collision or an application bug producing the
 * same JTI twice would leak unauthorised access.
 *
 * The constraint is partial because `token_hash` is NULL for `share_type =
 * 'user'` rows. Plain UNIQUE on a nullable column is fine in Postgres
 * (NULLs are not equal), but the partial form is more intent-revealing
 * and pairs with the existing `report_shares_unique_user_idx` partial
 * unique on user-typed shares.
 *
 * Built with `CREATE INDEX CONCURRENTLY` (ADS-402): `report_shares` is a
 * security-sensitive table on the auth-hot path; we cannot afford a
 * ShareLock during the build.
 */
const TOKEN_HASH_UNIQUE_IDX = 'report_shares_token_hash_unique_idx';
const TOKEN_HASH_PLAIN_IDX = 'report_shares_token_hash_idx';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Drop the plain non-unique index first (also concurrent — no lock).
    // It would otherwise be redundant alongside the new unique index.
    await dropIndexConcurrently(queryInterface.sequelize, TOKEN_HASH_PLAIN_IDX);

    await createIndexConcurrently(queryInterface.sequelize, {
      name: TOKEN_HASH_UNIQUE_IDX,
      table: 'report_shares',
      columns: ['token_hash'],
      unique: true,
      where: "share_type = 'token' AND token_hash IS NOT NULL",
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await dropIndexConcurrently(queryInterface.sequelize, TOKEN_HASH_UNIQUE_IDX);

    // Restore the original plain index so query plans for token lookups
    // don't regress to a sequential scan.
    await createIndexConcurrently(queryInterface.sequelize, {
      name: TOKEN_HASH_PLAIN_IDX,
      table: 'report_shares',
      columns: ['token_hash'],
    });
  },
};
