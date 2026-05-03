import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Add unique constraint on invitations.token
    await queryInterface.addConstraint('invitations', {
      fields: ['token'],
      type: 'unique',
      name: 'invitations_token_unique',
    });

    // Add index on rescue_id (FK performance)
    await queryInterface.addIndex('invitations', ['rescue_id'], {
      name: 'invitations_rescue_id_idx',
    });

    // Add index on user_id (FK performance)
    await queryInterface.addIndex('invitations', ['user_id'], {
      name: 'invitations_user_id_idx',
    });

    // Add index on email (lookup by invitee email)
    await queryInterface.addIndex('invitations', ['email'], {
      name: 'invitations_email_idx',
    });

    // Fix FK onDelete for rescue_id: CASCADE (invitation is meaningless without rescue)
    await queryInterface.removeConstraint('invitations', 'invitations_rescue_id_fkey').catch(() => {
      // Constraint name may differ; ignore if not found
    });
    await queryInterface.addConstraint('invitations', {
      fields: ['rescue_id'],
      type: 'foreign key',
      name: 'invitations_rescue_id_fkey',
      references: { table: 'rescues', field: 'rescue_id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Fix FK onDelete for user_id: SET NULL (keep invitation row if user deleted)
    await queryInterface.removeConstraint('invitations', 'invitations_user_id_fkey').catch(() => {
      // Constraint name may differ; ignore if not found
    });
    await queryInterface.addConstraint('invitations', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'invitations_user_id_fkey',
      references: { table: 'users', field: 'user_id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeConstraint('invitations', 'invitations_token_unique').catch(() => {});
    await queryInterface.removeIndex('invitations', 'invitations_rescue_id_idx').catch(() => {});
    await queryInterface.removeIndex('invitations', 'invitations_user_id_idx').catch(() => {});
    await queryInterface.removeIndex('invitations', 'invitations_email_idx').catch(() => {});

    // Restore FKs without explicit onDelete (defaults to NO ACTION)
    await queryInterface.removeConstraint('invitations', 'invitations_rescue_id_fkey').catch(() => {});
    await queryInterface.addConstraint('invitations', {
      fields: ['rescue_id'],
      type: 'foreign key',
      name: 'invitations_rescue_id_fkey',
      references: { table: 'rescues', field: 'rescue_id' },
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE',
    });

    await queryInterface.removeConstraint('invitations', 'invitations_user_id_fkey').catch(() => {});
    await queryInterface.addConstraint('invitations', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'invitations_user_id_fkey',
      references: { table: 'users', field: 'user_id' },
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE',
    });
  },
};
