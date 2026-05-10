/**
 * Round-trip tests for the per-model baseline migrations covering the
 * applications domain (rebaseline 4/10).
 *
 * Each migration is exercised by:
 *   1. Bootstrapping the schema via `sync({ force: true })` so the
 *      starting state matches what fresh databases will see today.
 *   2. Dropping the migration's table (CASCADE so any sync()-installed
 *      cross-table FKs to/from it come along) and any owned ENUM types.
 *   3. Running `up()` and asserting the table, key columns, and
 *      enumerated indexes exist.
 *   4. Running `down()` (with the destructive-down env-flags set so
 *      `assertDestructiveDownAcknowledged` permits it) and asserting
 *      the table and ENUM types are gone.
 *
 * Postgres-only — the migrations declare native ENUM types and use
 * `DataTypes.JSONB`, neither of which has a SQLite equivalent we
 * exercise here.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import * as models from '../../models';
import baseline020 from '../../migrations/00-baseline-020-applications';
import baseline021 from '../../migrations/00-baseline-021-application-answers';
import baseline022 from '../../migrations/00-baseline-022-application-questions';
import baseline023 from '../../migrations/00-baseline-023-application-references';
import baseline024 from '../../migrations/00-baseline-024-application-status-transitions';
import baseline025 from '../../migrations/00-baseline-025-application-timeline';
import baseline026 from '../../migrations/00-baseline-026-user-application-prefs';
import baseline027 from '../../migrations/00-baseline-027-home-visits';
import baseline028 from '../../migrations/00-baseline-028-home-visit-status-transitions';

// Force all model side-effects to run so `sync()` has every table.
void models;

const isPostgres = sequelize.getDialect() === 'postgres';
const describeIfPostgres = isPostgres ? describe : describe.skip;

const queryInterface = sequelize.getQueryInterface();

const tableExists = async (name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = '${name}'`
  );
  return (rows as unknown[]).length > 0;
};

const columnExists = async (table: string, column: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
       WHERE table_name = '${table}' AND column_name = '${column}'`
  );
  return (rows as unknown[]).length > 0;
};

const indexExists = async (table: string, name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = '${table}' AND indexname = '${name}'`
  );
  return (rows as unknown[]).length > 0;
};

const enumExists = async (name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_type WHERE typname = '${name}' AND typtype = 'e'`
  );
  return (rows as unknown[]).length > 0;
};

const dropTableCascade = async (name: string): Promise<void> => {
  await sequelize.query(`DROP TABLE IF EXISTS "${name}" CASCADE`);
};

const dropEnum = async (name: string): Promise<void> => {
  await sequelize.query(`DROP TYPE IF EXISTS "${name}"`);
};

const ackKey = (key: string): void => {
  process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN = '1';
  process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY = key;
};

const clearAck = (): void => {
  delete process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN;
  delete process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY;
};

describeIfPostgres('per-model baseline — applications domain (round trip)', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(() => {
    clearAck();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('00-baseline-020-applications', () => {
    beforeEach(async () => {
      await dropTableCascade('applications');
      await dropEnum('enum_applications_status');
      await dropEnum('enum_applications_priority');
      await dropEnum('enum_applications_stage');
      await dropEnum('enum_applications_final_outcome');
    });

    it('up() creates the applications table with its enumerated indexes', async () => {
      await baseline020.up(queryInterface);

      expect(await tableExists('applications')).toBe(true);
      expect(await columnExists('applications', 'application_id')).toBe(true);
      expect(await columnExists('applications', 'requires_coppa_consent')).toBe(true);
      expect(await columnExists('applications', 'references_consented')).toBe(true);
      expect(await columnExists('applications', 'version')).toBe(true);

      expect(await indexExists('applications', 'applications_user_id_idx')).toBe(true);
      expect(await indexExists('applications', 'applications_pet_id_idx')).toBe(true);
      expect(await indexExists('applications', 'applications_user_pet_unique')).toBe(true);
      expect(await indexExists('applications', 'applications_rescue_status_created_idx')).toBe(
        true
      );

      expect(await enumExists('enum_applications_status')).toBe(true);
      expect(await enumExists('enum_applications_stage')).toBe(true);
    });

    it('down() refuses without the destructive-down acknowledgement', async () => {
      await baseline020.up(queryInterface);
      await expect(baseline020.down(queryInterface)).rejects.toThrow(/destructive down/i);
    });

    it('down() drops the table and its enum types when acknowledged', async () => {
      await baseline020.up(queryInterface);
      ackKey('00-baseline-020-applications');

      await baseline020.down(queryInterface);

      expect(await tableExists('applications')).toBe(false);
      expect(await enumExists('enum_applications_status')).toBe(false);
      expect(await enumExists('enum_applications_priority')).toBe(false);
      expect(await enumExists('enum_applications_stage')).toBe(false);
      expect(await enumExists('enum_applications_final_outcome')).toBe(false);
    });
  });

  describe('00-baseline-021-application-answers', () => {
    beforeEach(async () => {
      await dropTableCascade('application_answers');
    });

    it('up() creates the application_answers table with its unique key index', async () => {
      await baseline021.up(queryInterface);

      expect(await tableExists('application_answers')).toBe(true);
      expect(await columnExists('application_answers', 'question_key')).toBe(true);
      expect(await columnExists('application_answers', 'answer_value')).toBe(true);
      expect(
        await indexExists('application_answers', 'application_answers_app_question_unique')
      ).toBe(true);
      expect(await indexExists('application_answers', 'application_answers_question_key_idx')).toBe(
        true
      );
    });

    it('down() drops the table when acknowledged', async () => {
      await baseline021.up(queryInterface);
      ackKey('00-baseline-021-application-answers');

      await baseline021.down(queryInterface);
      expect(await tableExists('application_answers')).toBe(false);
    });
  });

  describe('00-baseline-022-application-questions', () => {
    beforeEach(async () => {
      await dropTableCascade('application_questions');
      await dropEnum('enum_application_questions_scope');
      await dropEnum('enum_application_questions_category');
      await dropEnum('enum_application_questions_question_type');
    });

    it('up() creates the application_questions table with its three ENUM types', async () => {
      await baseline022.up(queryInterface);

      expect(await tableExists('application_questions')).toBe(true);
      expect(await columnExists('application_questions', 'scope')).toBe(true);
      expect(await columnExists('application_questions', 'category')).toBe(true);
      expect(await columnExists('application_questions', 'question_type')).toBe(true);

      expect(await enumExists('enum_application_questions_scope')).toBe(true);
      expect(await enumExists('enum_application_questions_category')).toBe(true);
      expect(await enumExists('enum_application_questions_question_type')).toBe(true);

      expect(
        await indexExists('application_questions', 'application_questions_key_rescue_unique')
      ).toBe(true);
      expect(
        await indexExists('application_questions', 'application_questions_core_key_unique')
      ).toBe(true);
    });

    it('down() drops the table and all three enum types when acknowledged', async () => {
      await baseline022.up(queryInterface);
      ackKey('00-baseline-022-application-questions');

      await baseline022.down(queryInterface);

      expect(await tableExists('application_questions')).toBe(false);
      expect(await enumExists('enum_application_questions_scope')).toBe(false);
      expect(await enumExists('enum_application_questions_category')).toBe(false);
      expect(await enumExists('enum_application_questions_question_type')).toBe(false);
    });
  });

  describe('00-baseline-023-application-references', () => {
    beforeEach(async () => {
      await dropTableCascade('application_references');
      await dropEnum('enum_application_references_status');
    });

    it('up() creates the application_references table with its status ENUM', async () => {
      await baseline023.up(queryInterface);

      expect(await tableExists('application_references')).toBe(true);
      expect(await columnExists('application_references', 'legacy_id')).toBe(true);
      expect(await columnExists('application_references', 'order_index')).toBe(true);
      expect(await enumExists('enum_application_references_status')).toBe(true);
      expect(
        await indexExists('application_references', 'application_references_app_legacy_unique')
      ).toBe(true);
    });

    it('down() drops the table and status ENUM when acknowledged', async () => {
      await baseline023.up(queryInterface);
      ackKey('00-baseline-023-application-references');

      await baseline023.down(queryInterface);
      expect(await tableExists('application_references')).toBe(false);
      expect(await enumExists('enum_application_references_status')).toBe(false);
    });
  });

  describe('00-baseline-024-application-status-transitions', () => {
    beforeEach(async () => {
      await dropTableCascade('application_status_transitions');
      await dropEnum('enum_application_status_transitions_from_status');
      await dropEnum('enum_application_status_transitions_to_status');
    });

    it('up() creates the transitions table with both from/to ENUM types', async () => {
      await baseline024.up(queryInterface);

      expect(await tableExists('application_status_transitions')).toBe(true);
      // Append-only event log — no updated_at column.
      expect(await columnExists('application_status_transitions', 'updated_at')).toBe(false);
      expect(await columnExists('application_status_transitions', 'transitioned_at')).toBe(true);
      expect(await enumExists('enum_application_status_transitions_from_status')).toBe(true);
      expect(await enumExists('enum_application_status_transitions_to_status')).toBe(true);
      expect(
        await indexExists(
          'application_status_transitions',
          'application_status_transitions_app_id_at_idx'
        )
      ).toBe(true);
    });

    it('down() drops the table and both ENUM types when acknowledged', async () => {
      await baseline024.up(queryInterface);
      ackKey('00-baseline-024-application-status-transitions');

      await baseline024.down(queryInterface);
      expect(await tableExists('application_status_transitions')).toBe(false);
      expect(await enumExists('enum_application_status_transitions_from_status')).toBe(false);
      expect(await enumExists('enum_application_status_transitions_to_status')).toBe(false);
    });
  });

  describe('00-baseline-025-application-timeline', () => {
    beforeEach(async () => {
      await dropTableCascade('application_timeline');
      await dropEnum('enum_application_timeline_event_type');
    });

    it('up() creates the timeline table with its event_type ENUM', async () => {
      await baseline025.up(queryInterface);

      expect(await tableExists('application_timeline')).toBe(true);
      // Append-only — paranoid: false on the model, no deleted_at column.
      expect(await columnExists('application_timeline', 'deleted_at')).toBe(false);
      expect(await enumExists('enum_application_timeline_event_type')).toBe(true);
      expect(
        await indexExists('application_timeline', 'application_timeline_application_id_idx')
      ).toBe(true);
      expect(await indexExists('application_timeline', 'application_timeline_created_by_idx')).toBe(
        true
      );
    });

    it('down() drops the table and event_type ENUM when acknowledged', async () => {
      await baseline025.up(queryInterface);
      ackKey('00-baseline-025-application-timeline');

      await baseline025.down(queryInterface);
      expect(await tableExists('application_timeline')).toBe(false);
      expect(await enumExists('enum_application_timeline_event_type')).toBe(false);
    });
  });

  describe('00-baseline-026-user-application-prefs', () => {
    beforeEach(async () => {
      await dropTableCascade('user_application_prefs');
    });

    it('up() creates the user_application_prefs table keyed by user_id', async () => {
      await baseline026.up(queryInterface);

      expect(await tableExists('user_application_prefs')).toBe(true);
      expect(await columnExists('user_application_prefs', 'user_id')).toBe(true);
      expect(await columnExists('user_application_prefs', 'auto_fill_profile')).toBe(true);
      expect(await columnExists('user_application_prefs', 'default_household_size')).toBe(true);
      expect(await columnExists('user_application_prefs', 'version')).toBe(true);
    });

    it('down() drops the table when acknowledged', async () => {
      await baseline026.up(queryInterface);
      ackKey('00-baseline-026-user-application-prefs');

      await baseline026.down(queryInterface);
      expect(await tableExists('user_application_prefs')).toBe(false);
    });
  });

  describe('00-baseline-027-home-visits', () => {
    beforeEach(async () => {
      await dropTableCascade('home_visits');
      await dropEnum('enum_home_visits_status');
      await dropEnum('enum_home_visits_outcome');
    });

    it('up() creates the home_visits table with its status and outcome ENUMs', async () => {
      await baseline027.up(queryInterface);

      expect(await tableExists('home_visits')).toBe(true);
      expect(await columnExists('home_visits', 'scheduled_date')).toBe(true);
      expect(await columnExists('home_visits', 'scheduled_time')).toBe(true);
      expect(await enumExists('enum_home_visits_status')).toBe(true);
      expect(await enumExists('enum_home_visits_outcome')).toBe(true);
      expect(await indexExists('home_visits', 'home_visits_application_id_idx')).toBe(true);
    });

    it('down() drops the table and both ENUM types when acknowledged', async () => {
      await baseline027.up(queryInterface);
      ackKey('00-baseline-027-home-visits');

      await baseline027.down(queryInterface);
      expect(await tableExists('home_visits')).toBe(false);
      expect(await enumExists('enum_home_visits_status')).toBe(false);
      expect(await enumExists('enum_home_visits_outcome')).toBe(false);
    });
  });

  describe('00-baseline-028-home-visit-status-transitions', () => {
    beforeEach(async () => {
      await dropTableCascade('home_visit_status_transitions');
      await dropEnum('enum_home_visit_status_transitions_from_status');
      await dropEnum('enum_home_visit_status_transitions_to_status');
    });

    it('up() creates the transitions table with both from/to ENUM types', async () => {
      await baseline028.up(queryInterface);

      expect(await tableExists('home_visit_status_transitions')).toBe(true);
      expect(await columnExists('home_visit_status_transitions', 'visit_id')).toBe(true);
      expect(await columnExists('home_visit_status_transitions', 'updated_at')).toBe(false);
      expect(await enumExists('enum_home_visit_status_transitions_from_status')).toBe(true);
      expect(await enumExists('enum_home_visit_status_transitions_to_status')).toBe(true);
      expect(
        await indexExists(
          'home_visit_status_transitions',
          'home_visit_status_transitions_visit_id_at_idx'
        )
      ).toBe(true);
    });

    it('down() drops the table and both ENUM types when acknowledged', async () => {
      await baseline028.up(queryInterface);
      ackKey('00-baseline-028-home-visit-status-transitions');

      await baseline028.down(queryInterface);
      expect(await tableExists('home_visit_status_transitions')).toBe(false);
      expect(await enumExists('enum_home_visit_status_transitions_from_status')).toBe(false);
      expect(await enumExists('enum_home_visit_status_transitions_to_status')).toBe(false);
    });
  });
});
