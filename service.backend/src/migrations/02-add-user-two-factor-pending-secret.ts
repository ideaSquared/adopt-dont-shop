/**
 * ADS-599: add pending 2FA secret columns to the users table.
 *
 * Previously `enableTwoFactor` accepted the TOTP secret from the request
 * body, letting a client (or a phishing flow) pin a known/attacker-
 * controlled secret to the account. The setup endpoint now writes the
 * server-generated secret (encrypted) to `two_factor_pending_secret`
 * with a short TTL in `two_factor_pending_expires_at`, and the enable
 * endpoint reads the pending secret from the row rather than trusting
 * the client.
 */
import { DataTypes, type QueryInterface } from 'sequelize';
import { runInTransaction } from './_helpers';

export default {
  up: async (queryInterface: QueryInterface) => {
    await runInTransaction(queryInterface, async t => {
      await queryInterface.addColumn(
        'users',
        'two_factor_pending_secret',
        {
          type: DataTypes.STRING,
          allowNull: true,
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        'users',
        'two_factor_pending_expires_at',
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
      await queryInterface.removeColumn('users', 'two_factor_pending_expires_at', {
        transaction: t,
      });
      await queryInterface.removeColumn('users', 'two_factor_pending_secret', {
        transaction: t,
      });
    });
  },
};
