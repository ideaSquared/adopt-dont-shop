import { QueryInterface, DataTypes } from 'sequelize';

/**
 * ADS-356: Replace registrationNumber/ein with companiesHouseNumber + charityRegistrationNumber
 * ADS-357: Add 'rejected' status to rescue state machine
 * ADS-359: Add unique constraints on new registration number fields
 * ADS-364: Add verificationSource, verificationFailureReason
 * ADS-360: Add manualVerificationRequestedAt
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    // Add new UK registration number fields
    await queryInterface.addColumn('rescues', 'companies_house_number', {
      type: DataTypes.STRING(8),
      allowNull: true,
    });
    await queryInterface.addColumn('rescues', 'charity_registration_number', {
      type: DataTypes.STRING(12),
      allowNull: true,
    });

    // Unique constraints on the new fields
    await queryInterface.addConstraint('rescues', {
      fields: ['companies_house_number'],
      type: 'unique',
      name: 'rescues_companies_house_number_unique',
    });
    await queryInterface.addConstraint('rescues', {
      fields: ['charity_registration_number'],
      type: 'unique',
      name: 'rescues_charity_registration_number_unique',
    });

    // Drop the old ambiguous fields
    await queryInterface.removeColumn('rescues', 'ein');
    await queryInterface.removeColumn('rescues', 'registration_number');

    // Add 'rejected' to the status enum.
    // ALTER TYPE ... ADD VALUE requires PostgreSQL 9.3+; IF NOT EXISTS requires 9.3+.
    // In PG 12+ this is safe inside a transaction; on older versions it must be committed
    // first. We use raw query; the migration framework will commit after up() returns.
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_rescues_status" ADD VALUE IF NOT EXISTS 'rejected'`
    );

    // Create enum type for verification source
    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_rescues_verification_source" AS ENUM ('companies_house', 'charity_commission', 'manual')`
    );

    await queryInterface.addColumn('rescues', 'verification_source', {
      type: DataTypes.ENUM('companies_house', 'charity_commission', 'manual'),
      allowNull: true,
    });

    await queryInterface.addColumn('rescues', 'verification_failure_reason', {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('rescues', 'manual_verification_requested_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('rescues', 'manual_verification_requested_at');
    await queryInterface.removeColumn('rescues', 'verification_failure_reason');
    await queryInterface.removeColumn('rescues', 'verification_source');
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_rescues_verification_source"`
    );

    await queryInterface.removeConstraint('rescues', 'rescues_companies_house_number_unique');
    await queryInterface.removeConstraint('rescues', 'rescues_charity_registration_number_unique');
    await queryInterface.removeColumn('rescues', 'companies_house_number');
    await queryInterface.removeColumn('rescues', 'charity_registration_number');

    // Restore old fields
    await queryInterface.addColumn('rescues', 'ein', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('rescues', 'registration_number', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    // Note: PostgreSQL does not support removing enum values. The 'rejected'
    // value will remain in enum_rescues_status after rollback, which is harmless
    // as long as no rows use it.
  },
};
