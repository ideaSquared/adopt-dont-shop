#!/usr/bin/env node

/**
 * rebaseline-seed-meta.ts — pre-seed SequelizeMeta for the per-model rebaseline.
 *
 * Operator-triggered, one-shot. Marks each per-model baseline file from
 * scripts/rebaseline-files.json as already-applied on existing DBs (DBs that
 * already ran the legacy `00-baseline.ts/.js`). Without this step, the
 * subsequent `db:migrate` would attempt to re-CREATE TABLE on tables that
 * already exist and fail.
 *
 * Three-state behaviour (mirrors docs/migrations/per-model-rebaseline.md §3.3):
 *
 *   1. SequelizeMeta does NOT exist               → fresh DB. No-op.
 *   2. SequelizeMeta exists AND has 00-baseline.* → existing DB. Pre-seed
 *      the per-model rows with the SAME extension (.ts or .js) as the
 *      existing baseline row.
 *   3. SequelizeMeta exists but no 00-baseline.*  → unexpected. Fail loudly.
 *
 * The script is idempotent — INSERT ... ON CONFLICT (name) DO NOTHING — so a
 * partial run can be safely re-attempted.
 *
 * Safety gates:
 *
 *   --dry-run / DRY_RUN=true  : print what WOULD be inserted; change nothing.
 *   --confirm / CONFIRM=true  : required to actually insert. Without it, the
 *                                script refuses to write.
 *
 * Usage:
 *
 *   # Dry-run (no writes):
 *   NODE_ENV=production npx ts-node scripts/rebaseline-seed-meta.ts --dry-run
 *
 *   # Real run (requires explicit confirmation):
 *   NODE_ENV=production npx ts-node scripts/rebaseline-seed-meta.ts --confirm
 *
 * Exits 0 on success, 1 on validation/state error, 2 on connection error.
 */

import path from 'path';
import { readFileSync } from 'fs';
import type { Sequelize } from 'sequelize';
import { z } from 'zod';

// --- Schema-first definitions for inputs/outputs --------------------------

const RebaselineFilesSchema = z.object({
  _comment: z.string().optional(),
  files: z.array(z.string().min(1)).min(1),
});

const ExtensionSchema = z.enum(['.ts', '.js']);
type Extension = z.infer<typeof ExtensionSchema>;

const RunModeSchema = z.enum(['dry-run', 'confirm']);
type RunMode = z.infer<typeof RunModeSchema>;

const SeedOutcomeSchema = z.object({
  state: z.enum(['fresh-db', 'existing-db', 'unexpected']),
  detectedExtension: ExtensionSchema.nullable(),
  candidateFiles: z.array(z.string()),
  insertedCount: z.number().int().nonnegative(),
  alreadyAppliedCount: z.number().int().nonnegative(),
  mode: RunModeSchema,
});
type SeedOutcome = z.infer<typeof SeedOutcomeSchema>;

// --- File list loader -----------------------------------------------------

const FILES_JSON_PATH = path.join(__dirname, 'rebaseline-files.json');

export const loadRebaselineFiles = (jsonPath: string = FILES_JSON_PATH): ReadonlyArray<string> => {
  const raw = readFileSync(jsonPath, 'utf-8');
  const parsed = RebaselineFilesSchema.parse(JSON.parse(raw));
  return parsed.files;
};

// --- Database state detection ---------------------------------------------

/**
 * Does the SequelizeMeta table exist in the current schema?
 *
 * Uses a portable check — works for both Postgres (information_schema) and
 * SQLite (sqlite_master) which is what the test suite uses.
 */
export const sequelizeMetaTableExists = async (sequelize: Sequelize): Promise<boolean> => {
  const dialect = sequelize.getDialect();
  if (dialect === 'sqlite') {
    const [rows] = await sequelize.query(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'SequelizeMeta'`
    );
    return (rows as ReadonlyArray<unknown>).length > 0;
  }
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = 'SequelizeMeta'`
  );
  return (rows as ReadonlyArray<unknown>).length > 0;
};

/**
 * Read the existing SequelizeMeta rows that match the legacy baseline name.
 * Returns the literal name strings so the caller can detect the extension.
 */
export const fetchBaselineRows = async (sequelize: Sequelize): Promise<ReadonlyArray<string>> => {
  const [rows] = await sequelize.query(
    `SELECT name FROM "SequelizeMeta" WHERE name LIKE '00-baseline.%'`
  );
  return (rows as ReadonlyArray<{ name: string }>).map(r => r.name);
};

/**
 * Choose the file extension to apply to per-model baseline filenames.
 *
 * If the live DB has exactly one of `00-baseline.ts` or `00-baseline.js`,
 * use that extension. If both are present, fail loudly — that's an
 * unexpected state we won't silently resolve.
 */
export const resolveExtension = (baselineRows: ReadonlyArray<string>): Extension => {
  const hasTs = baselineRows.includes('00-baseline.ts');
  const hasJs = baselineRows.includes('00-baseline.js');
  if (hasTs && hasJs) {
    throw new Error(
      'SequelizeMeta contains BOTH 00-baseline.ts and 00-baseline.js. Refusing to ' +
        'guess. Investigate which extension was actually applied and remove the ' +
        'spurious row before re-running.'
    );
  }
  if (hasTs) {
    return '.ts';
  }
  if (hasJs) {
    return '.js';
  }
  throw new Error(
    'No 00-baseline.{ts,js} row found in SequelizeMeta. Caller must check ' +
      'sequelizeMetaTableExists / fetchBaselineRows before calling resolveExtension.'
  );
};

// --- Pre-seed write -------------------------------------------------------

type SeedWriteResult = {
  insertedCount: number;
  alreadyAppliedCount: number;
};

/**
 * Insert one row per candidate filename using ON CONFLICT DO NOTHING.
 * Returns counts so the caller can report what changed.
 *
 * Caller passes `dryRun: true` to log without writing.
 */
export const seedSequelizeMeta = async (
  sequelize: Sequelize,
  candidateFiles: ReadonlyArray<string>,
  options: { dryRun: boolean }
): Promise<SeedWriteResult> => {
  // `IN (:names)` works on both Postgres and SQLite (Sequelize expands the
  // array bind to a parenthesised list). `ANY(:names)` is Postgres-only.
  const [existingRows] = await sequelize.query(
    `SELECT name FROM "SequelizeMeta" WHERE name IN (:names)`,
    { replacements: { names: [...candidateFiles] } }
  );
  const existingSet = new Set((existingRows as ReadonlyArray<{ name: string }>).map(r => r.name));
  const toInsert = candidateFiles.filter(f => !existingSet.has(f));

  if (options.dryRun || toInsert.length === 0) {
    return {
      insertedCount: 0,
      alreadyAppliedCount: existingSet.size,
    };
  }

  // Plain INSERT ... ON CONFLICT — Postgres-only construct. SQLite supports
  // INSERT OR IGNORE; the script's primary target is Postgres so we use the
  // standard ON CONFLICT clause and the test suite uses Postgres-compatible
  // SQLite (>=3.24 supports the same syntax).
  await sequelize.query(
    `INSERT INTO "SequelizeMeta" (name) VALUES ${toInsert.map((_, i) => `(:n${i})`).join(', ')}
       ON CONFLICT (name) DO NOTHING`,
    {
      replacements: Object.fromEntries(toInsert.map((name, i) => [`n${i}`, name])),
    }
  );

  return {
    insertedCount: toInsert.length,
    alreadyAppliedCount: existingSet.size,
  };
};

// --- Audit log writer -----------------------------------------------------

/**
 * Best-effort write of a single audit-log row recording the operation.
 * Failure to write the audit log is logged but does not fail the operation —
 * the audit row is operational telemetry, not a correctness gate.
 */
export const writeAuditRow = async (
  outcome: SeedOutcome,
  log: (msg: string) => void
): Promise<void> => {
  try {
    // Lazy import: keeps the test path that uses an isolated mock DB from
    // pulling in the full model registry just to import this module.
    const { default: AuditLog } = await import('../src/models/AuditLog');
    await AuditLog.create({
      service: 'rebaseline-seed-meta',
      user: null,
      action: 'sequelize_meta_preseed',
      level: 'INFO',
      status: 'success',
      category: 'DATA_MODIFICATION',
      metadata: {
        state: outcome.state,
        detectedExtension: outcome.detectedExtension,
        candidateFileCount: outcome.candidateFiles.length,
        insertedCount: outcome.insertedCount,
        alreadyAppliedCount: outcome.alreadyAppliedCount,
        mode: outcome.mode,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`audit-log write failed (non-fatal): ${message}`);
  }
};

// --- Top-level orchestration ---------------------------------------------

type RunOptions = {
  mode: RunMode;
  filesOverride?: ReadonlyArray<string>;
};

/**
 * Pure orchestration: detects state, computes candidates, performs (or skips)
 * the write, and returns the structured outcome. Does not exit, log, or
 * write the audit row — those are the responsibility of the CLI entrypoint.
 *
 * Tests exercise this function directly against a real Sequelize instance
 * (in-memory SQLite) so the three-state branches are verified without
 * subprocess shenanigans.
 */
export const runPreSeed = async (
  sequelize: Sequelize,
  options: RunOptions
): Promise<SeedOutcome> => {
  const baseFiles = options.filesOverride ?? loadRebaselineFiles();

  const metaExists = await sequelizeMetaTableExists(sequelize);
  if (!metaExists) {
    return SeedOutcomeSchema.parse({
      state: 'fresh-db',
      detectedExtension: null,
      candidateFiles: [],
      insertedCount: 0,
      alreadyAppliedCount: 0,
      mode: options.mode,
    });
  }

  const baselineRows = await fetchBaselineRows(sequelize);
  if (baselineRows.length === 0) {
    throw new Error(
      'SequelizeMeta exists but contains no 00-baseline.{ts,js} row. ' +
        'This is unexpected — the per-model rebaseline pre-seed assumes the ' +
        'legacy baseline migration already ran. Investigate before proceeding.'
    );
  }

  const ext = resolveExtension(baselineRows);
  const candidateFiles = baseFiles.map(f => `${f}${ext}`);

  const writeResult = await seedSequelizeMeta(sequelize, candidateFiles, {
    dryRun: options.mode === 'dry-run',
  });

  return SeedOutcomeSchema.parse({
    state: 'existing-db',
    detectedExtension: ext,
    candidateFiles,
    insertedCount: writeResult.insertedCount,
    alreadyAppliedCount: writeResult.alreadyAppliedCount,
    mode: options.mode,
  });
};

// --- CLI argument parsing -------------------------------------------------

export const parseRunMode = (argv: ReadonlyArray<string>, env: NodeJS.ProcessEnv): RunMode => {
  const args = new Set(argv.slice(2));
  const dryRunFlag = args.has('--dry-run') || env.DRY_RUN === 'true';
  const confirmFlag = args.has('--confirm') || env.CONFIRM === 'true';

  if (dryRunFlag && confirmFlag) {
    throw new Error('Pass exactly one of --dry-run / --confirm (got both).');
  }
  if (dryRunFlag) {
    return 'dry-run';
  }
  if (confirmFlag) {
    return 'confirm';
  }
  throw new Error(
    'Refusing to run without an explicit mode. Pass --dry-run (or DRY_RUN=true) ' +
      'to preview, or --confirm (or CONFIRM=true) to actually insert rows.'
  );
};

export const formatOutcome = (outcome: SeedOutcome): string => {
  if (outcome.state === 'fresh-db') {
    return (
      'state=fresh-db: SequelizeMeta does not exist. Skipping pre-seed — ' +
      'sequelize-cli db:migrate will create it and run all migrations.'
    );
  }
  return (
    `state=${outcome.state} mode=${outcome.mode} extension=${outcome.detectedExtension ?? 'n/a'} ` +
    `candidates=${outcome.candidateFiles.length} ` +
    `inserted=${outcome.insertedCount} already-applied=${outcome.alreadyAppliedCount}`
  );
};

// --- Main -----------------------------------------------------------------

const main = async (): Promise<void> => {
  const log = (msg: string): void => {
    process.stdout.write(`${msg}\n`);
  };
  const errLog = (msg: string): void => {
    process.stderr.write(`${msg}\n`);
  };

  let mode: RunMode;
  try {
    mode = parseRunMode(process.argv, process.env);
  } catch (error) {
    errLog(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Lazy import the live sequelize instance so importing this module from
  // tests doesn't open a real DB connection.
  const sequelizeModule = await import('../src/sequelize');
  const sequelize = sequelizeModule.default;

  try {
    const outcome = await runPreSeed(sequelize, { mode });
    log(formatOutcome(outcome));
    await writeAuditRow(outcome, errLog);
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errLog(`rebaseline-seed-meta error: ${message}`);
    await sequelize.close().catch(() => {
      /* swallow close errors during error path */
    });
    process.exit(2);
  }
};

if (require.main === module) {
  void main();
}
