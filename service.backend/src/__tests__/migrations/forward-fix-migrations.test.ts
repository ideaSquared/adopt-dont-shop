/**
 * Round-trip tests for the audit forward-fix migrations (ADS-484):
 *
 *   13 — ip_rules.cidr → CIDR type           (ADS-444)
 *   14 — revoked_tokens.updated_at           (ADS-502)
 *   15 — report_shares.token_hash UNIQUE     (ADS-505)
 *   16 — soft-delete partial indexes         (ADS-504)
 *   17 — file_uploads.url prefix backfill    (PR #415 follow-up)
 *   18 — JSONB url prefix backfill           (PR #421 cleanup)
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
import Chat from '../../models/Chat';
import Message from '../../models/Message';
import FileUpload from '../../models/FileUpload';
import migration13 from '../../migrations/13-convert-ip-rules-cidr-to-native';
import migration14 from '../../migrations/14-add-revoked-tokens-updated-at';
import migration15 from '../../migrations/15-add-report-shares-token-hash-unique-index';
import migration16 from '../../migrations/16-add-paranoid-partial-indexes';
import migration17 from '../../migrations/17-fix-fileupload-url-prefix';
import migration18 from '../../migrations/18-fix-jsonb-url-prefix';

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
void Chat;
void Message;
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

  describe('15 — JSONB url prefix backfill (PR #421 cleanup)', () => {
    /**
     * Both `messages.attachments` (JSONB array of MessageAttachment) and
     * `applications.documents` (JSONB array of ApplicationDocument) are
     * written via Sequelize models that enforce non-URL field shape via
     * validators. The migration only touches the `url`/`fileUrl` strings
     * inside each element — we sidestep the model layer with raw SQL for
     * the test fixtures so we can craft pre-#421 broken-shape rows that
     * the writer wouldn't accept today.
     */
    type JsonValue = unknown;

    let rescueId: string;
    let userId: string;
    let petId: string;
    let chatId: string;

    const insertUser = async (): Promise<string> => {
      const [rows] = await sequelize.query(
        `INSERT INTO users (email, password, first_name, last_name, user_type, status, email_verified, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING user_id`,
        {
          bind: [
            `m18-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
            'hashed-password',
            'M',
            'Eighteen',
            'adopter',
            'active',
            true,
          ] as unknown as never,
        }
      );
      return (rows as Array<{ user_id: string }>)[0].user_id;
    };

    const insertRescue = async (): Promise<string> => {
      const [rows] = await sequelize.query(
        `INSERT INTO rescues (name, email, phone, address, city, postcode, country, contact_person, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           RETURNING rescue_id`,
        {
          bind: [
            `M18 Rescue ${Math.random().toString(36).slice(2, 6)}`,
            `rescue-m18-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
            '555-0000',
            '1 Main St',
            'London',
            'SW1A 1AA',
            'GB',
            'Jane Doe',
            'pending',
          ] as unknown as never,
        }
      );
      return (rows as Array<{ rescue_id: string }>)[0].rescue_id;
    };

    const insertPet = async (rescueIdArg: string): Promise<string> => {
      const [rows] = await sequelize.query(
        `INSERT INTO pets (name, rescue_id, type, status, gender, age_group, created_at, updated_at)
           VALUES ($1, $2, 'dog', 'available', 'unknown', 'adult', NOW(), NOW())
           RETURNING pet_id`,
        {
          bind: [
            `M18 Pet ${Math.random().toString(36).slice(2, 6)}`,
            rescueIdArg,
          ] as unknown as never,
        }
      );
      return (rows as Array<{ pet_id: string }>)[0].pet_id;
    };

    const insertChat = async (rescueIdArg: string): Promise<string> => {
      const [rows] = await sequelize.query(
        `INSERT INTO chats (rescue_id, status, created_at, updated_at)
           VALUES ($1, 'active', NOW(), NOW())
           RETURNING chat_id`,
        { bind: [rescueIdArg] as unknown as never }
      );
      return (rows as Array<{ chat_id: string }>)[0].chat_id;
    };

    const insertMessageWithAttachments = async (attachments: JsonValue): Promise<string> => {
      const [rows] = await sequelize.query(
        `INSERT INTO messages (chat_id, sender_id, content, content_format, attachments, is_flagged, created_at, updated_at)
           VALUES ($1, $2, 'hello', 'plain', $3::jsonb, false, NOW(), NOW())
           RETURNING message_id`,
        {
          bind: [chatId, userId, JSON.stringify(attachments)] as unknown as never,
        }
      );
      return (rows as Array<{ message_id: string }>)[0].message_id;
    };

    const insertApplicationWithDocuments = async (documents: JsonValue): Promise<string> => {
      const [rows] = await sequelize.query(
        `INSERT INTO applications
           (user_id, pet_id, rescue_id, status, priority, stage, documents, created_at, updated_at)
           VALUES ($1, $2, $3, 'submitted', 'normal', 'pending', $4::jsonb, NOW(), NOW())
           RETURNING application_id`,
        {
          bind: [userId, petId, rescueId, JSON.stringify(documents)] as unknown as never,
        }
      );
      return (rows as Array<{ application_id: string }>)[0].application_id;
    };

    const readMessageAttachments = async (messageId: string): Promise<JsonValue> => {
      const [rows] = await sequelize.query(
        `SELECT attachments FROM messages WHERE message_id = '${messageId}'`
      );
      return (rows as Array<{ attachments: JsonValue }>)[0].attachments;
    };

    const readApplicationDocuments = async (applicationId: string): Promise<JsonValue> => {
      const [rows] = await sequelize.query(
        `SELECT documents FROM applications WHERE application_id = '${applicationId}'`
      );
      return (rows as Array<{ documents: JsonValue }>)[0].documents;
    };

    const countAuditLogEntries = async (): Promise<number> => {
      const [rows] = await sequelize.query(
        `SELECT COUNT(*)::int AS n FROM audit_logs
           WHERE service = 'migration'
             AND action LIKE 'migration-18-fix-jsonb-url-prefix:%'`
      );
      return (rows as Array<{ n: number }>)[0].n;
    };

    beforeEach(async () => {
      rescueId = await insertRescue();
      userId = await insertUser();
      petId = await insertPet(rescueId);
      chatId = await insertChat(rescueId);
    });

    // ---- messages.attachments[].url ----

    describe('messages.attachments[].url', () => {
      it('up() rewrites broken /uploads/<filename> to /uploads/chat/<filename>', async () => {
        const id = await insertMessageWithAttachments([
          {
            attachment_id: 'a1',
            filename: 'photo.jpg',
            originalName: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            url: '/uploads/chat_1700000000000_abc.jpg',
          },
        ]);

        await migration18.up(queryInterface);

        const after = await readMessageAttachments(id);
        expect(after).toEqual([
          expect.objectContaining({
            url: '/uploads/chat/chat_1700000000000_abc.jpg',
          }),
        ]);
      });

      it('up() leaves already-prefixed URLs alone', async () => {
        const correctUrl = '/uploads/chat/chat_1700000000000_already.jpg';
        const id = await insertMessageWithAttachments([
          {
            attachment_id: 'a1',
            filename: 'photo.jpg',
            originalName: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            url: correctUrl,
          },
        ]);

        await migration18.up(queryInterface);

        const after = await readMessageAttachments(id);
        expect(after).toEqual([expect.objectContaining({ url: correctUrl })]);
      });

      it('up() preserves CDN / external URL overrides', async () => {
        const cdnUrl = 'https://cdn.example.com/foo.jpg';
        const id = await insertMessageWithAttachments([
          {
            attachment_id: 'a1',
            filename: 'photo.jpg',
            originalName: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            url: cdnUrl,
          },
        ]);

        await migration18.up(queryInterface);

        const after = await readMessageAttachments(id);
        expect(after).toEqual([expect.objectContaining({ url: cdnUrl })]);
      });

      it('up() is idempotent — second run is a no-op on rewritten rows', async () => {
        const id = await insertMessageWithAttachments([
          {
            attachment_id: 'a1',
            filename: 'photo.jpg',
            originalName: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            url: '/uploads/chat_1700000000000_dbl.jpg',
          },
        ]);

        await migration18.up(queryInterface);
        await migration18.up(queryInterface);

        const after = await readMessageAttachments(id);
        expect(after).toEqual([
          expect.objectContaining({
            url: '/uploads/chat/chat_1700000000000_dbl.jpg',
          }),
        ]);
      });

      it('up() handles empty attachments arrays without error', async () => {
        const id = await insertMessageWithAttachments([]);

        await migration18.up(queryInterface);

        const after = await readMessageAttachments(id);
        expect(after).toEqual([]);
      });

      it('up() rewrites only broken-shape elements when array mixes shapes', async () => {
        const id = await insertMessageWithAttachments([
          {
            attachment_id: 'a1',
            filename: 'broken.jpg',
            originalName: 'broken.jpg',
            mimeType: 'image/jpeg',
            size: 1,
            url: '/uploads/chat_111_broken.jpg',
          },
          {
            attachment_id: 'a2',
            filename: 'cdn.jpg',
            originalName: 'cdn.jpg',
            mimeType: 'image/jpeg',
            size: 1,
            url: 'https://cdn.example.com/cdn.jpg',
          },
          {
            attachment_id: 'a3',
            filename: 'ok.jpg',
            originalName: 'ok.jpg',
            mimeType: 'image/jpeg',
            size: 1,
            url: '/uploads/chat/chat_222_ok.jpg',
          },
        ]);

        await migration18.up(queryInterface);

        const after = (await readMessageAttachments(id)) as Array<{
          attachment_id: string;
          url: string;
        }>;
        expect(after.find(a => a.attachment_id === 'a1')?.url).toBe(
          '/uploads/chat/chat_111_broken.jpg'
        );
        expect(after.find(a => a.attachment_id === 'a2')?.url).toBe(
          'https://cdn.example.com/cdn.jpg'
        );
        expect(after.find(a => a.attachment_id === 'a3')?.url).toBe(
          '/uploads/chat/chat_222_ok.jpg'
        );
      });

      it('down() restores the broken shape on rows up() rewrote', async () => {
        const id = await insertMessageWithAttachments([
          {
            attachment_id: 'a1',
            filename: 'photo.jpg',
            originalName: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            url: '/uploads/chat_1700000000000_round.jpg',
          },
        ]);

        await migration18.up(queryInterface);
        await migration18.down(queryInterface);

        const after = await readMessageAttachments(id);
        expect(after).toEqual([
          expect.objectContaining({
            url: '/uploads/chat_1700000000000_round.jpg',
          }),
        ]);
      });

      it('down() leaves URLs with non-chat prefix alone (not produced by up)', async () => {
        // A pre-existing row whose URL points at a different prefix — e.g.
        // because someone hand-seeded an attachment record. down() must
        // not strip its prefix because up() never touched it.
        const externalUrl = '/uploads/profiles/avatar.jpg';
        const id = await insertMessageWithAttachments([
          {
            attachment_id: 'a1',
            filename: 'avatar.jpg',
            originalName: 'avatar.jpg',
            mimeType: 'image/jpeg',
            size: 1,
            url: externalUrl,
          },
        ]);

        await migration18.down(queryInterface);

        const after = await readMessageAttachments(id);
        expect(after).toEqual([expect.objectContaining({ url: externalUrl })]);
      });
    });

    // ---- applications.documents[].fileUrl ----

    describe('applications.documents[].fileUrl', () => {
      const sampleDocument = (overrides: Record<string, unknown>): Record<string, unknown> => ({
        documentId: `doc-${Math.random().toString(36).slice(2, 6)}`,
        documentType: 'id',
        fileName: 'id.pdf',
        uploadedAt: new Date().toISOString(),
        verified: false,
        ...overrides,
      });

      it('up() rewrites broken /uploads/<filename> to /uploads/applications/<filename>', async () => {
        const id = await insertApplicationWithDocuments([
          sampleDocument({ fileUrl: '/uploads/applications_1700_abc.pdf' }),
        ]);

        await migration18.up(queryInterface);

        const after = (await readApplicationDocuments(id)) as Array<{
          fileUrl: string;
        }>;
        expect(after[0].fileUrl).toBe('/uploads/applications/applications_1700_abc.pdf');
      });

      it('up() leaves already-prefixed URLs alone', async () => {
        const correctUrl = '/uploads/applications/applications_1700_ok.pdf';
        const id = await insertApplicationWithDocuments([sampleDocument({ fileUrl: correctUrl })]);

        await migration18.up(queryInterface);

        const after = (await readApplicationDocuments(id)) as Array<{
          fileUrl: string;
        }>;
        expect(after[0].fileUrl).toBe(correctUrl);
      });

      it('up() preserves CDN / external URL overrides', async () => {
        const cdnUrl = 'https://cdn.example.com/applications/foo.pdf';
        const id = await insertApplicationWithDocuments([sampleDocument({ fileUrl: cdnUrl })]);

        await migration18.up(queryInterface);

        const after = (await readApplicationDocuments(id)) as Array<{
          fileUrl: string;
        }>;
        expect(after[0].fileUrl).toBe(cdnUrl);
      });

      it('up() is idempotent — second run is a no-op on rewritten rows', async () => {
        const id = await insertApplicationWithDocuments([
          sampleDocument({ fileUrl: '/uploads/applications_1700_dbl.pdf' }),
        ]);

        await migration18.up(queryInterface);
        await migration18.up(queryInterface);

        const after = (await readApplicationDocuments(id)) as Array<{
          fileUrl: string;
        }>;
        expect(after[0].fileUrl).toBe('/uploads/applications/applications_1700_dbl.pdf');
      });

      it('up() handles empty documents arrays without error', async () => {
        const id = await insertApplicationWithDocuments([]);

        await migration18.up(queryInterface);

        const after = await readApplicationDocuments(id);
        expect(after).toEqual([]);
      });

      it('up() leaves elements lacking a fileUrl key alone', async () => {
        // Defensive: even though the model requires fileUrl, raw rows
        // could lack it (e.g. partially-written legacy fixture). The
        // migration should not crash on them and should not invent one.
        const id = await insertApplicationWithDocuments([
          {
            documentId: 'doc-no-url',
            documentType: 'id',
            fileName: 'id.pdf',
            uploadedAt: new Date().toISOString(),
            verified: false,
          },
          sampleDocument({ fileUrl: '/uploads/applications_1700_mix.pdf' }),
        ]);

        await migration18.up(queryInterface);

        const after = (await readApplicationDocuments(id)) as Array<{
          documentId: string;
          fileUrl?: string;
        }>;
        expect(after.find(d => d.documentId === 'doc-no-url')?.fileUrl).toBeUndefined();
        expect(after.find(d => d.fileUrl)?.fileUrl).toBe(
          '/uploads/applications/applications_1700_mix.pdf'
        );
      });

      it('down() restores the broken shape on rows up() rewrote', async () => {
        const id = await insertApplicationWithDocuments([
          sampleDocument({ fileUrl: '/uploads/applications_1700_round.pdf' }),
        ]);

        await migration18.up(queryInterface);
        await migration18.down(queryInterface);

        const after = (await readApplicationDocuments(id)) as Array<{
          fileUrl: string;
        }>;
        expect(after[0].fileUrl).toBe('/uploads/applications_1700_round.pdf');
      });

      it('down() leaves URLs with non-applications prefix alone (not produced by up)', async () => {
        // A row whose URL has a different prefix (e.g. seeded via a
        // legacy `documents/` directory). down() must not strip the
        // prefix because up() didn't write this shape.
        const seededUrl = '/uploads/documents/legacy_doc.pdf';
        const id = await insertApplicationWithDocuments([sampleDocument({ fileUrl: seededUrl })]);

        await migration18.down(queryInterface);

        const after = (await readApplicationDocuments(id)) as Array<{
          fileUrl: string;
        }>;
        expect(after[0].fileUrl).toBe(seededUrl);
      });
    });

    // ---- audit log ----

    it('writes a single audit-log entry per direction summarising rows touched', async () => {
      await insertMessageWithAttachments([
        {
          attachment_id: 'a1',
          filename: 'photo.jpg',
          originalName: 'photo.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          url: '/uploads/chat_audit.jpg',
        },
      ]);
      await insertApplicationWithDocuments([
        {
          documentId: 'doc-1',
          documentType: 'id',
          fileName: 'id.pdf',
          fileUrl: '/uploads/applications_audit.pdf',
          uploadedAt: new Date().toISOString(),
          verified: false,
        },
      ]);

      await migration18.up(queryInterface);
      expect(await countAuditLogEntries()).toBe(1);

      await migration18.down(queryInterface);
      expect(await countAuditLogEntries()).toBe(2);

      const [rows] = await sequelize.query(
        `SELECT action, metadata FROM audit_logs
           WHERE service = 'migration'
             AND action LIKE 'migration-18-fix-jsonb-url-prefix:%'
           ORDER BY id ASC`
      );
      const entries = rows as Array<{ action: string; metadata: Record<string, unknown> }>;
      expect(entries[0].action).toBe('migration-18-fix-jsonb-url-prefix:up');
      expect(entries[1].action).toBe('migration-18-fix-jsonb-url-prefix:down');
      expect(entries[0].metadata).toMatchObject({
        migration: '18-fix-jsonb-url-prefix',
        direction: 'up',
        results: expect.arrayContaining([
          expect.objectContaining({ table: 'messages' }),
          expect.objectContaining({ table: 'applications' }),
        ]),
      });
    });
  });
});
