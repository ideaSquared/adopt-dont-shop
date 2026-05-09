/**
 * Round-trip tests for the audit forward-fix migrations (ADS-484):
 *
 *   13 — ip_rules.cidr → CIDR type           (ADS-444)
 *   14 — revoked_tokens.updated_at           (ADS-502)
 *   15 — report_shares.token_hash UNIQUE     (ADS-505)
 *   16 — soft-delete partial indexes         (ADS-504)
 *   17 — file_uploads.url prefix backfill    (PR #415 follow-up)
 *
 * Every test runs `up`, asserts the post-state, runs `down`, and asserts
 * the pre-state is restored. Postgres-only — the migration bodies use
 * dialect-specific features (CIDR cast, partial unique with predicate,
 * `CREATE INDEX CONCURRENTLY`) that have no SQLite equivalent.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import {
  Rescue,
  IpRule,
  RevokedToken,
  ReportShare,
  SavedReport,
  User,
  Pet,
  Application,
} from '../../models';
import FileUpload from '../../models/FileUpload';
import migration13 from '../../migrations/13-convert-ip-rules-cidr-to-native';
import migration14 from '../../migrations/14-add-revoked-tokens-updated-at';
import migration15 from '../../migrations/15-add-report-shares-token-hash-unique-index';
import migration16 from '../../migrations/16-add-paranoid-partial-indexes';
import migration17 from '../../migrations/17-fix-fileupload-url-prefix';

// Reference models so they register with the Sequelize instance before
// `sync()` runs.
void Rescue;
void IpRule;
void RevokedToken;
void ReportShare;
void SavedReport;
void User;
void Pet;
void Application;
void FileUpload;

const isPostgres = sequelize.getDialect() === 'postgres';
const describeIfPostgres = isPostgres ? describe : describe.skip;

type ColumnInfo = { data_type: string; udt_name: string };
type IndexInfo = { indexname: string; indexdef: string };

const describeColumn = async (table: string, column: string): Promise<ColumnInfo | undefined> => {
  const [rows] = await sequelize.query(
    `SELECT data_type, udt_name FROM information_schema.columns
       WHERE table_name = '${table}' AND column_name = '${column}'`
  );
  return (rows as ColumnInfo[])[0];
};

const findIndex = async (table: string, name: string): Promise<IndexInfo | undefined> => {
  const [rows] = await sequelize.query(
    `SELECT indexname, indexdef FROM pg_indexes
       WHERE tablename = '${table}' AND indexname = '${name}'`
  );
  return (rows as IndexInfo[])[0];
};

const queryInterface = sequelize.getQueryInterface();

describeIfPostgres('forward-fix migrations — up/down round trip (ADS-484)', () => {
  beforeEach(async () => {
    // Rebuild the post-migration baseline before each test.
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('10 — ip_rules.cidr → CIDR (ADS-444)', () => {
    // The IpRule model already declares cidr as DataTypes.CIDR, so a fresh
    // sync() leaves the column as `cidr` already. To test the migration we
    // first downgrade the column to VARCHAR, then run up(), then down().
    beforeEach(async () => {
      await sequelize.query(
        'ALTER TABLE ip_rules ALTER COLUMN cidr TYPE VARCHAR(64) USING cidr::TEXT'
      );
    });

    it('up() promotes cidr to native CIDR type', async () => {
      const before = await describeColumn('ip_rules', 'cidr');
      expect(before?.udt_name).toBe('varchar');

      await migration13.up(queryInterface);

      const after = await describeColumn('ip_rules', 'cidr');
      expect(after?.udt_name).toBe('cidr');
    });

    it('down() restores VARCHAR(64)', async () => {
      await migration13.up(queryInterface);
      await migration13.down(queryInterface);

      const col = await describeColumn('ip_rules', 'cidr');
      expect(col?.udt_name).toBe('varchar');
    });

    it('CIDR type rejects malformed input after up()', async () => {
      await migration13.up(queryInterface);

      await expect(
        sequelize.query(
          `INSERT INTO ip_rules (type, cidr, is_active, created_at, updated_at)
             VALUES ('block', 'not-a-cidr', true, NOW(), NOW())`
        )
      ).rejects.toThrow();
    });
  });

  describe('11 — revoked_tokens.updated_at (ADS-502)', () => {
    beforeEach(async () => {
      // Drop the column so up() has something to add.
      await sequelize.query('ALTER TABLE revoked_tokens DROP COLUMN IF EXISTS updated_at');
    });

    it('up() adds updated_at column', async () => {
      await migration14.up(queryInterface);

      const col = await describeColumn('revoked_tokens', 'updated_at');
      expect(col).toBeDefined();
      expect(col?.data_type).toContain('timestamp');
    });

    it('down() removes updated_at column', async () => {
      await migration14.up(queryInterface);
      await migration14.down(queryInterface);

      const col = await describeColumn('revoked_tokens', 'updated_at');
      expect(col).toBeUndefined();
    });
  });

  describe('12 — report_shares.token_hash UNIQUE (ADS-505)', () => {
    beforeEach(async () => {
      // The model already has the new unique index on a fresh sync — but
      // it doesn't, because we haven't updated the model. The current
      // baseline has only the plain index. Make sure it's there.
      const plain = await findIndex('report_shares', 'report_shares_token_hash_idx');
      if (!plain) {
        await sequelize.query(
          'CREATE INDEX report_shares_token_hash_idx ON report_shares (token_hash)'
        );
      }
      await sequelize.query(
        'DROP INDEX CONCURRENTLY IF EXISTS report_shares_token_hash_unique_idx'
      );
    });

    it('up() creates the partial unique index and drops the plain one', async () => {
      await migration15.up(queryInterface);

      const unique = await findIndex('report_shares', 'report_shares_token_hash_unique_idx');
      expect(unique).toBeDefined();
      expect(unique?.indexdef).toContain('UNIQUE');
      expect(unique?.indexdef).toContain('share_type');

      const plain = await findIndex('report_shares', 'report_shares_token_hash_idx');
      expect(plain).toBeUndefined();
    });

    it('down() drops the unique index and restores the plain one', async () => {
      await migration15.up(queryInterface);
      await migration15.down(queryInterface);

      const unique = await findIndex('report_shares', 'report_shares_token_hash_unique_idx');
      expect(unique).toBeUndefined();

      const plain = await findIndex('report_shares', 'report_shares_token_hash_idx');
      expect(plain).toBeDefined();
    });
  });

  describe('13 — soft-delete partial indexes (ADS-504)', () => {
    const expectedIndexes = [
      { table: 'users', name: 'users_email_active_idx' },
      { table: 'pets', name: 'pets_status_active_idx' },
      { table: 'applications', name: 'applications_rescue_status_active_idx' },
    ];

    beforeEach(async () => {
      // Drop pre-existing partial indexes so up() can create them cleanly.
      for (const { name } of expectedIndexes) {
        await sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS "${name}"`);
      }
    });

    it('up() creates the partial indexes with deleted_at IS NULL predicate', async () => {
      await migration16.up(queryInterface);

      for (const { table, name } of expectedIndexes) {
        const idx = await findIndex(table, name);
        expect(idx).toBeDefined();
        expect(idx?.indexdef).toContain('deleted_at IS NULL');
      }
    });

    it('down() removes the partial indexes', async () => {
      await migration16.up(queryInterface);
      await migration16.down(queryInterface);

      for (const { table, name } of expectedIndexes) {
        const idx = await findIndex(table, name);
        expect(idx).toBeUndefined();
      }
    });
  });

  describe('14 — file_uploads.url prefix backfill (PR #415 follow-up)', () => {
    let uploaderId: string;

    const insertFileUpload = async (overrides: Record<string, unknown>) => {
      const row = {
        original_filename: 'photo.jpg',
        stored_filename: `pets_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`,
        file_path: 'pets/photo.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024,
        url: '/uploads/pets_1234_uuid.jpg',
        uploaded_by: uploaderId,
        metadata: '{}',
        ...overrides,
      };
      const cols = Object.keys(row);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const values = cols.map(c => (row as Record<string, unknown>)[c]);
      const [rows] = await sequelize.query(
        `INSERT INTO file_uploads (${cols.join(', ')}, created_at, updated_at)
           VALUES (${placeholders}, NOW(), NOW())
           RETURNING upload_id, url, thumbnail_url`,
        { bind: values as unknown as never }
      );
      return (rows as Array<Record<string, unknown>>)[0];
    };

    const readUrls = async (
      uploadId: string
    ): Promise<{ url: string; thumbnail_url: string | null }> => {
      const [rows] = await sequelize.query(
        `SELECT url, thumbnail_url FROM file_uploads WHERE upload_id = '${uploadId}'`
      );
      return (rows as Array<{ url: string; thumbnail_url: string | null }>)[0];
    };

    beforeEach(async () => {
      // Insert a user for the uploaded_by FK. Re-uses sync()'d schema.
      const [userRows] = await sequelize.query(
        `INSERT INTO users (email, password, first_name, last_name, user_type, status, email_verified, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING user_id`,
        {
          bind: [
            `uploader-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
            'hashed-password',
            'Up',
            'Loader',
            'adopter',
            'active',
            true,
          ] as unknown as never,
        }
      );
      uploaderId = (userRows as Array<{ user_id: string }>)[0].user_id;
    });

    it('up() rewrites a broken /uploads/<filename> to /uploads/<prefix>/<filename>', async () => {
      const inserted = await insertFileUpload({
        stored_filename: 'pets_1700000000000_abc123.jpg',
        url: '/uploads/pets_1700000000000_abc123.jpg',
      });

      await migration17.up(queryInterface);

      const after = await readUrls(inserted.upload_id as string);
      expect(after.url).toBe('/uploads/pets/pets_1700000000000_abc123.jpg');
    });

    it('up() rewrites thumbnail_url with the same rule', async () => {
      const inserted = await insertFileUpload({
        stored_filename: 'applications_1700000000000_xyz789.pdf',
        url: '/uploads/applications_1700000000000_xyz789.pdf',
        thumbnail_url: '/uploads/applications_1700000000000_xyz789.thumb.jpg',
      });

      await migration17.up(queryInterface);

      const after = await readUrls(inserted.upload_id as string);
      expect(after.url).toBe('/uploads/applications/applications_1700000000000_xyz789.pdf');
      expect(after.thumbnail_url).toBe(
        '/uploads/applications/applications_1700000000000_xyz789.thumb.jpg'
      );
    });

    it('up() leaves already-prefixed URLs alone (idempotent on correctly-shaped rows)', async () => {
      const correctUrl = '/uploads/chat/chat_1700000000000_abc.jpg';
      const inserted = await insertFileUpload({
        stored_filename: 'chat_1700000000000_abc.jpg',
        url: correctUrl,
      });

      await migration17.up(queryInterface);

      const after = await readUrls(inserted.upload_id as string);
      expect(after.url).toBe(correctUrl);
    });

    it('up() is safe to run twice (idempotent)', async () => {
      const inserted = await insertFileUpload({
        stored_filename: 'pets_1700000000000_dbl.jpg',
        url: '/uploads/pets_1700000000000_dbl.jpg',
      });

      await migration17.up(queryInterface);
      await migration17.up(queryInterface);

      const after = await readUrls(inserted.upload_id as string);
      expect(after.url).toBe('/uploads/pets/pets_1700000000000_dbl.jpg');
    });

    it('up() preserves CDN / external URL overrides', async () => {
      const cdnUrl = 'https://cdn.example.com/pets/foo.jpg';
      const inserted = await insertFileUpload({
        stored_filename: 'pets_1700000000000_cdn.jpg',
        url: cdnUrl,
      });

      await migration17.up(queryInterface);

      const after = await readUrls(inserted.upload_id as string);
      expect(after.url).toBe(cdnUrl);
    });

    it('up() leaves rows whose stored_filename does not match the writer convention', async () => {
      // Hand-seeded shape (uses '-' instead of '_'). The seeder URL is
      // already correctly shaped so there is nothing to fix; we should
      // not silently rewrite to a wrong prefix.
      const inserted = await insertFileUpload({
        stored_filename: 'chat-1700000000000-abc.jpg',
        url: '/uploads/chat-1700000000000-abc.jpg',
      });

      await migration17.up(queryInterface);

      const after = await readUrls(inserted.upload_id as string);
      expect(after.url).toBe('/uploads/chat-1700000000000-abc.jpg');
    });

    it('down() restores broken-shape URLs for rows up() rewrote', async () => {
      const inserted = await insertFileUpload({
        stored_filename: 'pets_1700000000000_round.jpg',
        url: '/uploads/pets_1700000000000_round.jpg',
        thumbnail_url: '/uploads/pets_1700000000000_round.thumb.jpg',
      });

      await migration17.up(queryInterface);
      await migration17.down(queryInterface);

      const after = await readUrls(inserted.upload_id as string);
      expect(after.url).toBe('/uploads/pets_1700000000000_round.jpg');
      expect(after.thumbnail_url).toBe('/uploads/pets_1700000000000_round.thumb.jpg');
    });

    it('down() leaves correctly-shaped rows it did not insert alone', async () => {
      // A row where stored_filename does NOT match the URL's filename —
      // down() must not strip the prefix because this row pre-dated the
      // migration and was not produced by up().
      const externalUrl = '/uploads/pets/some-other-name.jpg';
      const inserted = await insertFileUpload({
        stored_filename: 'pets_1700000000000_unmatched.jpg',
        url: externalUrl,
      });

      await migration17.down(queryInterface);

      const after = await readUrls(inserted.upload_id as string);
      expect(after.url).toBe(externalUrl);
    });
  });
});
