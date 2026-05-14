import { QueryInterface, DataTypes } from 'sequelize';

/**
 * ADS-105: Custom analytics report builder.
 *
 * Four additive tables. None are referenced by existing tables, so this
 * migration is fully reversible by `down`.
 *
 *   report_templates   — pre-built configs. `is_system` rows are seeded;
 *                        non-system rows can be created by users with the
 *                        `reports.template.manage` permission.
 *   saved_reports      — user-authored report configurations (filters,
 *                        layout, widgets[]). Owner is `user_id`. `rescue_id`
 *                        is the scope: NULL = platform-scope (super-admin /
 *                        admin), set = rescue-scope (rescue staff).
 *   scheduled_reports  — cron + recipients + delivery format for a saved
 *                        report. `next_run_at` lets us reconcile BullMQ
 *                        repeatables on boot. `repeat_job_key` stores the
 *                        BullMQ key so we can remove the repeatable on
 *                        delete/disable.
 *   report_shares      — sharing model. `share_type='user'` rows let a
 *                        named user view/edit; `share_type='token'` rows
 *                        store sha256(jti) of a signed share JWT for
 *                        revocable token-based access.
 *
 * Order matters: report_templates is created first because saved_reports
 * has a FK to it.
 */
export default {
  up: async (queryInterface: QueryInterface) => {
    // Idempotency (follow-up to #451 / #454): the per-model rebaseline ships
    // `00-baseline-043…046-*.ts` which create these 4 tables for fresh DBs.
    // On a fresh DB the baselines run first, so `createTable` collides with
    // "relation already exists". Single early-return precheck on the first
    // table — the per-domain baselines create all 4 together, so a partial
    // state is not a normal outcome. Same pattern PR #451 used for mig 12
    // (`user_consents`). `down()` is intentionally unchanged.
    const [existing] = await queryInterface.sequelize.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'report_templates'`
    );
    if ((existing as unknown[]).length > 0) {
      return;
    }

    // 1. report_templates
    await queryInterface.createTable('report_templates', {
      template_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.ENUM('adoption', 'engagement', 'operations', 'fundraising', 'custom'),
        allowNull: false,
      },
      config: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      is_system: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      rescue_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'rescues', key: 'rescue_id' },
        onDelete: 'CASCADE',
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL',
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });
    await queryInterface.addIndex('report_templates', ['category'], {
      name: 'report_templates_category_idx',
    });
    await queryInterface.addIndex('report_templates', ['is_system'], {
      name: 'report_templates_is_system_idx',
    });
    await queryInterface.addIndex('report_templates', ['rescue_id'], {
      name: 'report_templates_rescue_idx',
    });

    // 2. saved_reports
    await queryInterface.createTable('saved_reports', {
      saved_report_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'CASCADE',
      },
      rescue_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'rescues', key: 'rescue_id' },
        onDelete: 'CASCADE',
      },
      template_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'report_templates', key: 'template_id' },
        onDelete: 'SET NULL',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      config: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      is_archived: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL',
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });
    await queryInterface.addIndex('saved_reports', ['rescue_id', 'user_id'], {
      name: 'saved_reports_rescue_user_idx',
    });
    await queryInterface.addIndex('saved_reports', ['template_id'], {
      name: 'saved_reports_template_idx',
    });
    await queryInterface.addIndex('saved_reports', ['is_archived'], {
      name: 'saved_reports_archived_idx',
    });

    // 3. scheduled_reports
    await queryInterface.createTable('scheduled_reports', {
      schedule_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      saved_report_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'saved_reports', key: 'saved_report_id' },
        onDelete: 'CASCADE',
      },
      cron: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      timezone: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'UTC',
      },
      recipients: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      format: {
        type: DataTypes.ENUM('pdf', 'csv', 'inline-html'),
        allowNull: false,
        defaultValue: 'pdf',
      },
      is_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_run_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      next_run_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_status: {
        type: DataTypes.ENUM('pending', 'success', 'failed'),
        allowNull: true,
      },
      last_error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      repeat_job_key: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL',
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });
    await queryInterface.addIndex('scheduled_reports', ['saved_report_id'], {
      name: 'scheduled_reports_saved_report_idx',
    });
    await queryInterface.addIndex('scheduled_reports', ['is_enabled', 'next_run_at'], {
      name: 'scheduled_reports_enabled_next_run_idx',
    });

    // 4. report_shares
    await queryInterface.createTable('report_shares', {
      share_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      saved_report_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'saved_reports', key: 'saved_report_id' },
        onDelete: 'CASCADE',
      },
      share_type: {
        type: DataTypes.ENUM('user', 'token'),
        allowNull: false,
      },
      shared_with_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'CASCADE',
      },
      token_hash: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      permission: {
        type: DataTypes.ENUM('view', 'edit'),
        allowNull: false,
        defaultValue: 'view',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'SET NULL',
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });
    await queryInterface.addIndex('report_shares', ['saved_report_id'], {
      name: 'report_shares_saved_report_idx',
    });
    // Plain FK index — matches the standards test enforcement that every
    // FK column has an index. The unique index below is partial (only on
    // user-typed shares), so it doesn't satisfy the FK index requirement.
    await queryInterface.addIndex('report_shares', ['shared_with_user_id'], {
      name: 'report_shares_shared_with_user_idx',
    });
    // Partial unique on user shares only — token shares share the same row
    // with shared_with_user_id NULL, so we cannot put a plain unique on
    // (saved_report_id, shared_with_user_id).
    await queryInterface.addIndex('report_shares', ['saved_report_id', 'shared_with_user_id'], {
      name: 'report_shares_unique_user_idx',
      unique: true,
      where: { share_type: 'user' },
    });
    await queryInterface.addIndex('report_shares', ['token_hash'], {
      name: 'report_shares_token_hash_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('report_shares');
    await queryInterface.dropTable('scheduled_reports');
    await queryInterface.dropTable('saved_reports');
    await queryInterface.dropTable('report_templates');
  },
};
