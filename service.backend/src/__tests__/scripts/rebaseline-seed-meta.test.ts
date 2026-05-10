/**
 * Behaviour tests for scripts/rebaseline-seed-meta.ts.
 *
 * The script's job is operator-triggered, one-shot SequelizeMeta pre-seeding
 * for the per-model rebaseline. The behaviours that matter to the operator:
 *
 *   1. Fresh DB (no SequelizeMeta) → no-op.
 *   2. Existing DB with 00-baseline.ts → pre-seed using .ts extension.
 *   3. Existing DB with 00-baseline.js → pre-seed using .js extension.
 *   4. Existing DB with both 00-baseline.ts AND .js → fail loudly.
 *   5. Existing DB with NO 00-baseline row → fail loudly.
 *   6. Dry-run preview never writes rows.
 *   7. CLI mode-parsing requires explicit --dry-run or --confirm.
 *   8. The script is idempotent — second run inserts nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sequelize } from 'sequelize';
import {
  runPreSeed,
  parseRunMode,
  loadRebaselineFiles,
} from '../../../scripts/rebaseline-seed-meta';

const PER_MODEL_FILES = ['00-baseline-001-users', '00-baseline-002-roles'];

const buildSequelize = (): Sequelize =>
  new Sequelize('sqlite::memory:', { dialect: 'sqlite', logging: false });

const ensureSequelizeMeta = async (sequelize: Sequelize): Promise<void> => {
  await sequelize.query(`CREATE TABLE "SequelizeMeta" (name VARCHAR(255) NOT NULL PRIMARY KEY)`);
};

const insertMetaRow = async (sequelize: Sequelize, name: string): Promise<void> => {
  await sequelize.query(`INSERT INTO "SequelizeMeta" (name) VALUES (:n)`, {
    replacements: { n: name },
  });
};

const fetchAllMetaNames = async (sequelize: Sequelize): Promise<ReadonlyArray<string>> => {
  const [rows] = await sequelize.query(`SELECT name FROM "SequelizeMeta" ORDER BY name`);
  return (rows as ReadonlyArray<{ name: string }>).map(r => r.name);
};

describe('rebaseline-seed-meta', () => {
  let sequelize: Sequelize;

  beforeEach(() => {
    sequelize = buildSequelize();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  describe('runPreSeed', () => {
    it('reports fresh-db and writes nothing when SequelizeMeta does not exist', async () => {
      const outcome = await runPreSeed(sequelize, {
        mode: 'confirm',
        filesOverride: PER_MODEL_FILES,
      });

      expect(outcome.state).toBe('fresh-db');
      expect(outcome.detectedExtension).toBeNull();
      expect(outcome.insertedCount).toBe(0);
      expect(outcome.candidateFiles).toEqual([]);
    });

    it('detects .ts extension and inserts per-model rows on an existing DB', async () => {
      await ensureSequelizeMeta(sequelize);
      await insertMetaRow(sequelize, '00-baseline.ts');

      const outcome = await runPreSeed(sequelize, {
        mode: 'confirm',
        filesOverride: PER_MODEL_FILES,
      });

      expect(outcome.state).toBe('existing-db');
      expect(outcome.detectedExtension).toBe('.ts');
      expect(outcome.insertedCount).toBe(2);
      expect(outcome.candidateFiles).toEqual([
        '00-baseline-001-users.ts',
        '00-baseline-002-roles.ts',
      ]);
      const names = await fetchAllMetaNames(sequelize);
      expect(names).toContain('00-baseline-001-users.ts');
      expect(names).toContain('00-baseline-002-roles.ts');
    });

    it('detects .js extension when prod ran the dist/ build', async () => {
      await ensureSequelizeMeta(sequelize);
      await insertMetaRow(sequelize, '00-baseline.js');

      const outcome = await runPreSeed(sequelize, {
        mode: 'confirm',
        filesOverride: PER_MODEL_FILES,
      });

      expect(outcome.detectedExtension).toBe('.js');
      expect(outcome.candidateFiles).toEqual([
        '00-baseline-001-users.js',
        '00-baseline-002-roles.js',
      ]);
      const names = await fetchAllMetaNames(sequelize);
      expect(names).toContain('00-baseline-001-users.js');
    });

    it('refuses to guess when both 00-baseline.ts and 00-baseline.js are present', async () => {
      await ensureSequelizeMeta(sequelize);
      await insertMetaRow(sequelize, '00-baseline.ts');
      await insertMetaRow(sequelize, '00-baseline.js');

      await expect(
        runPreSeed(sequelize, { mode: 'confirm', filesOverride: PER_MODEL_FILES })
      ).rejects.toThrow(/BOTH 00-baseline\.ts and 00-baseline\.js/);
    });

    it('fails loudly when SequelizeMeta exists but no 00-baseline row is present', async () => {
      await ensureSequelizeMeta(sequelize);
      await insertMetaRow(sequelize, '01-create-revoked-tokens.ts');

      await expect(
        runPreSeed(sequelize, { mode: 'confirm', filesOverride: PER_MODEL_FILES })
      ).rejects.toThrow(/no 00-baseline\.\{ts,js\} row/);
    });

    it('dry-run mode reports planned inserts but writes nothing', async () => {
      await ensureSequelizeMeta(sequelize);
      await insertMetaRow(sequelize, '00-baseline.ts');

      const outcome = await runPreSeed(sequelize, {
        mode: 'dry-run',
        filesOverride: PER_MODEL_FILES,
      });

      expect(outcome.mode).toBe('dry-run');
      expect(outcome.insertedCount).toBe(0);
      expect(outcome.candidateFiles).toHaveLength(2);
      const names = await fetchAllMetaNames(sequelize);
      expect(names).toEqual(['00-baseline.ts']);
    });

    it('is idempotent — re-running reports zero new inserts', async () => {
      await ensureSequelizeMeta(sequelize);
      await insertMetaRow(sequelize, '00-baseline.ts');

      const first = await runPreSeed(sequelize, {
        mode: 'confirm',
        filesOverride: PER_MODEL_FILES,
      });
      const second = await runPreSeed(sequelize, {
        mode: 'confirm',
        filesOverride: PER_MODEL_FILES,
      });

      expect(first.insertedCount).toBe(2);
      expect(second.insertedCount).toBe(0);
      expect(second.alreadyAppliedCount).toBe(2);
    });
  });

  describe('parseRunMode', () => {
    const baseEnv: NodeJS.ProcessEnv = {};

    it('treats --dry-run as dry-run mode', () => {
      expect(parseRunMode(['node', 'script', '--dry-run'], baseEnv)).toBe('dry-run');
    });

    it('treats --confirm as confirm mode', () => {
      expect(parseRunMode(['node', 'script', '--confirm'], baseEnv)).toBe('confirm');
    });

    it('honours DRY_RUN=true env var', () => {
      expect(parseRunMode(['node', 'script'], { DRY_RUN: 'true' })).toBe('dry-run');
    });

    it('honours CONFIRM=true env var', () => {
      expect(parseRunMode(['node', 'script'], { CONFIRM: 'true' })).toBe('confirm');
    });

    it('refuses to run without a mode flag', () => {
      expect(() => parseRunMode(['node', 'script'], baseEnv)).toThrow(
        /Refusing to run without an explicit mode/
      );
    });

    it('refuses ambiguous --dry-run + --confirm', () => {
      expect(() => parseRunMode(['node', 'script', '--dry-run', '--confirm'], baseEnv)).toThrow(
        /exactly one of --dry-run \/ --confirm/
      );
    });
  });

  describe('loadRebaselineFiles', () => {
    // The global vitest setup mocks `fs`, so to exercise the JSON-loader
    // path we provide its content via a mocked readFileSync. Behaviour under
    // test: extension-less bare filenames, all prefixed with `00-baseline-`.
    it('parses scripts/rebaseline-files.json into a non-empty list of bare filenames', async () => {
      const fs = await import('fs');
      const stub = JSON.stringify({
        files: ['00-baseline-001-users', '00-baseline-002-roles'],
      });
      vi.spyOn(fs, 'readFileSync').mockReturnValue(stub);
      const files = loadRebaselineFiles();
      expect(files.length).toBeGreaterThan(0);
      for (const f of files) {
        expect(f).not.toMatch(/\.(ts|js)$/);
        expect(f).toMatch(/^00-baseline-/);
      }
    });
  });
});
