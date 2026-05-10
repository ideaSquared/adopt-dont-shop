/**
 * Round-trip tests for the pets-domain per-model baseline migrations
 * (rebaseline 3/10).
 *
 * Each test:
 *   1. Drops the table the migration creates (sync() in beforeEach left
 *      it behind), so up() has work to do.
 *   2. Runs `up()` and asserts the canonical columns / indexes appear.
 *   3. Runs `down()` (with the destructive-down ack) and asserts the
 *      table is gone.
 *
 * Postgres-only — the four files use ENUM, ARRAY, TSVECTOR, GEOMETRY,
 * and partial indexes; SQLite has no equivalent. Skipped on SQLite via
 * `describeIfPostgres`, matching the existing migrations test pattern.
 */
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import * as models from '../../models';
import baseline016Pets from '../../migrations/00-baseline-016-pets';
import baseline017PetMedia from '../../migrations/00-baseline-017-pet-media';
import baseline018PetStatusTransitions from '../../migrations/00-baseline-018-pet-status-transitions';
import baseline019Breeds from '../../migrations/00-baseline-019-breeds';

// Reference all models so they register with sequelize before sync().
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

const indexExists = async (table: string, name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = '${table}' AND indexname = '${name}'`
  );
  return (rows as unknown[]).length > 0;
};

type ColumnInfo = { is_nullable: string; data_type: string; udt_name: string };

const describeColumn = async (table: string, column: string): Promise<ColumnInfo | undefined> => {
  const [rows] = await sequelize.query(
    `SELECT is_nullable, data_type, udt_name FROM information_schema.columns
       WHERE table_name = '${table}' AND column_name = '${column}'`
  );
  return (rows as ColumnInfo[])[0];
};

const enumExists = async (name: string): Promise<boolean> => {
  const [rows] = await sequelize.query(`SELECT 1 FROM pg_type WHERE typname = '${name}'`);
  return (rows as unknown[]).length > 0;
};

const enableDestructiveDown = (key: string): void => {
  process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN = '1';
  process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY = key;
};

const disableDestructiveDown = (): void => {
  delete process.env.MIGRATION_ALLOW_DESTRUCTIVE_DOWN;
  delete process.env.MIGRATION_DESTRUCTIVE_DOWN_KEY;
};

describeIfPostgres('per-model baseline migrations — pets domain (rebaseline 3/10)', () => {
  beforeAll(async () => {
    // Make sure the schema has all the expected tables before each test
    // truncates them. sync() here leaves the existing PG schema in its
    // post-migration state.
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(() => {
    disableDestructiveDown();
  });

  describe('00-baseline-016-pets', () => {
    beforeEach(async () => {
      // pets is referenced by pet_media, pet_status_transitions, ratings,
      // chats, applications, swipe_actions, user_favorites, etc. Drop
      // dependents before pets so the FK constraints don't block the
      // dropTable. CASCADE on the raw query is the simplest path.
      await sequelize.query('DROP TABLE IF EXISTS pets CASCADE');
      // Drop the enum types so up() recreates them cleanly.
      const enums = [
        'enum_pets_age_group',
        'enum_pets_gender',
        'enum_pets_status',
        'enum_pets_type',
        'enum_pets_size',
        'enum_pets_energy_level',
        'enum_pets_vaccination_status',
        'enum_pets_spay_neuter_status',
      ];
      for (const e of enums) {
        await sequelize.query(`DROP TYPE IF EXISTS "${e}" CASCADE`);
      }
    });

    it('up() creates the pets table with the expected columns and indexes', async () => {
      expect(await tableExists('pets')).toBe(false);

      await baseline016Pets.up(queryInterface);

      expect(await tableExists('pets')).toBe(true);

      // Spot-check a representative slice of columns rather than the
      // whole 60-row sheet — the goal is to catch shape regressions, not
      // re-state the schema.
      const petId = await describeColumn('pets', 'pet_id');
      expect(petId).toMatchObject({ is_nullable: 'NO', udt_name: 'uuid' });

      // rescue_id is NULLABLE in sync() output despite the model saying
      // allowNull: false — locking that in here.
      const rescueId = await describeColumn('pets', 'rescue_id');
      expect(rescueId).toMatchObject({ is_nullable: 'YES', udt_name: 'uuid' });

      const status = await describeColumn('pets', 'status');
      expect(status).toMatchObject({
        is_nullable: 'NO',
        udt_name: 'enum_pets_status',
      });

      const location = await describeColumn('pets', 'location');
      expect(location).toMatchObject({ udt_name: 'geometry' });

      const searchVector = await describeColumn('pets', 'search_vector');
      expect(searchVector).toMatchObject({ udt_name: 'tsvector' });

      const tags = await describeColumn('pets', 'tags');
      expect(tags?.data_type).toBe('ARRAY');

      const version = await describeColumn('pets', 'version');
      expect(version).toMatchObject({ is_nullable: 'NO', udt_name: 'int4' });
    });

    it('up() creates all model-declared indexes including partial uniques and the GIN/GIST shapes', async () => {
      await baseline016Pets.up(queryInterface);

      const expectedIndexes = [
        'pets_rescue_id_idx',
        'pets_status_idx',
        'pets_type_idx',
        'pets_size_idx',
        'pets_age_group_idx',
        'pets_gender_idx',
        'pets_breed_id_idx',
        'pets_secondary_breed_id_idx',
        'pets_featured_idx',
        'pets_priority_idx',
        'pets_created_at_idx',
        'pets_available_since_idx',
        'pets_microchip_unique',
        'pets_microchip_id_key',
        'pets_search_vector_gin_idx',
        'pets_location_gist_idx',
        'pets_status_rescue_idx',
        'pets_status_type_size_idx',
        'pets_deleted_at_idx',
        'pets_created_by_idx',
        'pets_updated_by_idx',
      ];
      for (const name of expectedIndexes) {
        expect(await indexExists('pets', name)).toBe(true);
      }

      const [rows] = await sequelize.query(
        `SELECT indexdef FROM pg_indexes
           WHERE tablename = 'pets' AND indexname = 'pets_microchip_unique'`
      );
      const def = (rows as Array<{ indexdef: string }>)[0]?.indexdef ?? '';
      expect(def).toContain('UNIQUE');
      expect(def).toContain('microchip_id IS NOT NULL');
    });

    it('down() drops the pets table and its enum types', async () => {
      await baseline016Pets.up(queryInterface);
      enableDestructiveDown('00-baseline-016-pets');

      await baseline016Pets.down(queryInterface);

      expect(await tableExists('pets')).toBe(false);
      expect(await enumExists('enum_pets_status')).toBe(false);
      expect(await enumExists('enum_pets_type')).toBe(false);
      expect(await enumExists('enum_pets_age_group')).toBe(false);
    });

    it('down() refuses to run without the destructive-down acknowledgement', async () => {
      await baseline016Pets.up(queryInterface);
      // No env vars set — the guard should reject.
      await expect(baseline016Pets.down(queryInterface)).rejects.toThrow(
        /Refusing to run destructive down/
      );
      // Table must still be there.
      expect(await tableExists('pets')).toBe(true);
    });
  });

  describe('00-baseline-017-pet-media', () => {
    beforeEach(async () => {
      await sequelize.query('DROP TABLE IF EXISTS pet_media CASCADE');
      await sequelize.query('DROP TYPE IF EXISTS "enum_pet_media_type" CASCADE');
    });

    it('up() creates pet_media with the canonical column shape', async () => {
      expect(await tableExists('pet_media')).toBe(false);

      await baseline017PetMedia.up(queryInterface);

      expect(await tableExists('pet_media')).toBe(true);
      // pet_id retains NOT NULL on this table (the belongsTo association
      // doesn't downgrade the model's allowNull: false).
      const petId = await describeColumn('pet_media', 'pet_id');
      expect(petId).toMatchObject({ is_nullable: 'NO', udt_name: 'uuid' });

      const type = await describeColumn('pet_media', 'type');
      expect(type).toMatchObject({ udt_name: 'enum_pet_media_type' });

      const isPrimary = await describeColumn('pet_media', 'is_primary');
      expect(isPrimary).toMatchObject({ is_nullable: 'NO', udt_name: 'bool' });
    });

    it('up() creates the partial-unique primary-image index and FK indexes', async () => {
      await baseline017PetMedia.up(queryInterface);

      expect(await indexExists('pet_media', 'pet_media_pet_order_idx')).toBe(true);
      expect(await indexExists('pet_media', 'pet_media_pet_type_idx')).toBe(true);
      expect(await indexExists('pet_media', 'pet_media_one_primary_per_pet')).toBe(true);
      expect(await indexExists('pet_media', 'pet_media_created_by_idx')).toBe(true);
      expect(await indexExists('pet_media', 'pet_media_updated_by_idx')).toBe(true);

      const [rows] = await sequelize.query(
        `SELECT indexdef FROM pg_indexes
           WHERE tablename = 'pet_media' AND indexname = 'pet_media_one_primary_per_pet'`
      );
      const def = (rows as Array<{ indexdef: string }>)[0]?.indexdef ?? '';
      expect(def).toContain('UNIQUE');
      expect(def).toContain('is_primary = true');
    });

    it('down() drops pet_media and its enum type', async () => {
      await baseline017PetMedia.up(queryInterface);
      enableDestructiveDown('00-baseline-017-pet-media');

      await baseline017PetMedia.down(queryInterface);

      expect(await tableExists('pet_media')).toBe(false);
      expect(await enumExists('enum_pet_media_type')).toBe(false);
    });

    it('down() refuses to run without the destructive-down acknowledgement', async () => {
      await baseline017PetMedia.up(queryInterface);
      await expect(baseline017PetMedia.down(queryInterface)).rejects.toThrow(
        /Refusing to run destructive down/
      );
      expect(await tableExists('pet_media')).toBe(true);
    });
  });

  describe('00-baseline-018-pet-status-transitions', () => {
    beforeEach(async () => {
      await sequelize.query('DROP TABLE IF EXISTS pet_status_transitions CASCADE');
      await sequelize.query(
        'DROP TYPE IF EXISTS "enum_pet_status_transitions_from_status" CASCADE'
      );
      await sequelize.query('DROP TYPE IF EXISTS "enum_pet_status_transitions_to_status" CASCADE');
    });

    it('up() creates the append-only event-log table', async () => {
      expect(await tableExists('pet_status_transitions')).toBe(false);

      await baseline018PetStatusTransitions.up(queryInterface);

      expect(await tableExists('pet_status_transitions')).toBe(true);

      const transitionId = await describeColumn('pet_status_transitions', 'transition_id');
      expect(transitionId).toMatchObject({ is_nullable: 'NO', udt_name: 'uuid' });

      // pet_id is NULLABLE in sync() output (belongsTo override).
      const petId = await describeColumn('pet_status_transitions', 'pet_id');
      expect(petId).toMatchObject({ is_nullable: 'YES', udt_name: 'uuid' });

      const fromStatus = await describeColumn('pet_status_transitions', 'from_status');
      expect(fromStatus).toMatchObject({
        is_nullable: 'YES',
        udt_name: 'enum_pet_status_transitions_from_status',
      });

      const toStatus = await describeColumn('pet_status_transitions', 'to_status');
      expect(toStatus).toMatchObject({
        is_nullable: 'NO',
        udt_name: 'enum_pet_status_transitions_to_status',
      });

      // No timestamps (timestamps: false on the model), no audit columns.
      const createdAt = await describeColumn('pet_status_transitions', 'created_at');
      expect(createdAt).toBeUndefined();
      const version = await describeColumn('pet_status_transitions', 'version');
      expect(version).toBeUndefined();
    });

    it('up() creates the (pet_id, transitioned_at) and transitioned_by indexes', async () => {
      await baseline018PetStatusTransitions.up(queryInterface);

      expect(
        await indexExists('pet_status_transitions', 'pet_status_transitions_pet_id_at_idx')
      ).toBe(true);
      expect(
        await indexExists('pet_status_transitions', 'pet_status_transitions_transitioned_by_idx')
      ).toBe(true);
    });

    it('down() drops the table and both per-column enum types', async () => {
      await baseline018PetStatusTransitions.up(queryInterface);
      enableDestructiveDown('00-baseline-018-pet-status-transitions');

      await baseline018PetStatusTransitions.down(queryInterface);

      expect(await tableExists('pet_status_transitions')).toBe(false);
      expect(await enumExists('enum_pet_status_transitions_from_status')).toBe(false);
      expect(await enumExists('enum_pet_status_transitions_to_status')).toBe(false);
    });

    it('down() refuses to run without the destructive-down acknowledgement', async () => {
      await baseline018PetStatusTransitions.up(queryInterface);
      await expect(baseline018PetStatusTransitions.down(queryInterface)).rejects.toThrow(
        /Refusing to run destructive down/
      );
      expect(await tableExists('pet_status_transitions')).toBe(true);
    });
  });

  describe('00-baseline-019-breeds', () => {
    beforeEach(async () => {
      await sequelize.query('DROP TABLE IF EXISTS breeds CASCADE');
      await sequelize.query('DROP TYPE IF EXISTS "enum_breeds_species" CASCADE');
    });

    it('up() creates the breeds lookup table without a deleted_at column', async () => {
      expect(await tableExists('breeds')).toBe(false);

      await baseline019Breeds.up(queryInterface);

      expect(await tableExists('breeds')).toBe(true);

      const breedId = await describeColumn('breeds', 'breed_id');
      expect(breedId).toMatchObject({ is_nullable: 'NO', udt_name: 'uuid' });

      const species = await describeColumn('breeds', 'species');
      expect(species).toMatchObject({ udt_name: 'enum_breeds_species' });

      // paranoid: false on the model — no deleted_at column.
      const deletedAt = await describeColumn('breeds', 'deleted_at');
      expect(deletedAt).toBeUndefined();

      // version + audit columns still present (auditColumns spread).
      const version = await describeColumn('breeds', 'version');
      expect(version).toMatchObject({ is_nullable: 'NO', udt_name: 'int4' });
    });

    it('up() creates the (species, name) composite unique index and the FK indexes', async () => {
      await baseline019Breeds.up(queryInterface);

      expect(await indexExists('breeds', 'breeds_species_name_unique')).toBe(true);
      expect(await indexExists('breeds', 'breeds_name_idx')).toBe(true);
      expect(await indexExists('breeds', 'breeds_created_by_idx')).toBe(true);
      expect(await indexExists('breeds', 'breeds_updated_by_idx')).toBe(true);

      const [rows] = await sequelize.query(
        `SELECT indexdef FROM pg_indexes
           WHERE tablename = 'breeds' AND indexname = 'breeds_species_name_unique'`
      );
      const def = (rows as Array<{ indexdef: string }>)[0]?.indexdef ?? '';
      expect(def).toContain('UNIQUE');
      expect(def).toContain('species');
      expect(def).toContain('name');
    });

    it('down() drops the breeds table and its enum type', async () => {
      await baseline019Breeds.up(queryInterface);
      enableDestructiveDown('00-baseline-019-breeds');

      await baseline019Breeds.down(queryInterface);

      expect(await tableExists('breeds')).toBe(false);
      expect(await enumExists('enum_breeds_species')).toBe(false);
    });

    it('down() refuses to run without the destructive-down acknowledgement', async () => {
      await baseline019Breeds.up(queryInterface);
      await expect(baseline019Breeds.down(queryInterface)).rejects.toThrow(
        /Refusing to run destructive down/
      );
      expect(await tableExists('breeds')).toBe(true);
    });
  });
});
