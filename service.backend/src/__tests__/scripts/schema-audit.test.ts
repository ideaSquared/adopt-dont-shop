/**
 * Behaviour tests for scripts/schema-audit.ts.
 *
 * The audit script is a read-only diff tool: given the registered Sequelize
 * models and a live database, it must accurately report which tables match
 * the model definition and which have drifted. These tests exercise three
 * core behaviours against the in-memory SQLite test DB:
 *
 *   1. A freshly synced schema (models == DB) reports no drift.
 *   2. Adding an unknown column directly via SQL surfaces as "extra column".
 *   3. Dropping a model column from the DB surfaces as "missing column".
 *
 * The script's purpose is to gate the per-model rebaseline plan
 * (docs/migrations/per-model-rebaseline.md §3) — operators run it against
 * staging/prod before pre-seeding SequelizeMeta, so a false negative
 * (reports "ok" when drift exists) is the failure mode that matters most.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sequelize from '../../sequelize';
import '../../models/index';
import { auditSchema } from '../../../scripts/schema-audit';

describe('schema-audit', () => {
  beforeEach(async () => {
    // Rebuild from models so each test starts from the canonical baseline.
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await sequelize.sync({ force: true });
  });

  it('reports no drift when the live schema matches the models', async () => {
    const report = await auditSchema(sequelize);
    const drifted = report.tables.filter(t => t.status !== 'ok');
    const detail = drifted
      .map(
        t =>
          `${t.table}:${t.status} cols=[${t.columns
            .map(c => `${c.kind}:${c.column}(exp=${c.expected}/act=${c.actual})`)
            .join('|')}] idx=[${t.indexes
            .map(i => `${i.kind}:${i.index}(exp=${i.expected}/act=${i.actual})`)
            .join('|')}]`
      )
      .join('\n');
    expect(drifted, `Expected no drift but got:\n${detail}`).toHaveLength(0);
    expect(report.driftedTables).toBe(0);
  });

  it('flags an extra column that no model declares', async () => {
    // Add a column directly so the live DB diverges from the model.
    await sequelize.query(`ALTER TABLE users ADD COLUMN unexpected_column TEXT`);

    const report = await auditSchema(sequelize);

    expect(report.driftedTables).toBeGreaterThan(0);
    const usersReport = report.tables.find(t => t.table === 'users');
    expect(usersReport).toBeDefined();
    expect(usersReport?.status).toBe('drift');
    const extraDrift = usersReport?.columns.find(c => c.column === 'unexpected_column');
    expect(extraDrift).toBeDefined();
    expect(extraDrift?.kind).toBe('extra');
  });

  it('flags a missing column when the live DB lacks one a model declares', async () => {
    // Recreate users without one of the model's columns. SQLite supports
    // DROP COLUMN since 3.35; project test sqlite is recent enough.
    await sequelize.query(`ALTER TABLE users DROP COLUMN bio`);

    const report = await auditSchema(sequelize);

    expect(report.driftedTables).toBeGreaterThan(0);
    const usersReport = report.tables.find(t => t.table === 'users');
    expect(usersReport).toBeDefined();
    expect(usersReport?.status).toBe('drift');
    const missingDrift = usersReport?.columns.find(c => c.column === 'bio' && c.kind === 'missing');
    expect(missingDrift).toBeDefined();
  });
});
