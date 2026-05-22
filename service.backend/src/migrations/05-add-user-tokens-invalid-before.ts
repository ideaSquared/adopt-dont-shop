/**
 * Add `tokens_invalid_before` to users so the auth middleware can reject
 * stale access tokens issued before a security-state change (role
 * change, password reset, 2FA toggle, …).
 *
 * Semantics:
 *   - NULL          → no rotation enforced; every valid JWT passes the iat check.
 *   - TIMESTAMP X   → any access token with `iat < X` is rejected at the next request.
 *
 * Set by the User model `beforeUpdate` hook when `userType` changes,
 * and by explicit `invalidateUserTokens()` calls from credential-change
 * code paths (password reset, 2FA enable/disable).
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.addColumn(
        'users',
        'tokens_invalid_before',
        {
          type: DataTypes.DATE,
          allowNull: true,
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.removeColumn('users', 'tokens_invalid_before', { transaction: t });
    });
  },
};
