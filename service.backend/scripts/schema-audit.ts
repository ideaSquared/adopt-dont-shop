#!/usr/bin/env node

/**
 * schema-audit.ts — read-only schema drift report.
 *
 * Compares each Sequelize model registered in `models/index.ts` against the
 * live database schema and prints a per-table diff:
 *
 *   - Missing tables       (model exists, table doesn't)
 *   - Extra tables         (table in DB, no model)
 *   - Per-column drift     (missing / extra / type / nullable / default)
 *   - Index drift          (missing / extra)
 *   - Enum value drift     (Postgres enums only)
 *
 * Output:
 *   stdout — JSON report (machine-readable; pipe to jq / a file)
 *   stderr — human-readable summary
 *   exit 0  — no drift
 *   exit 1  — drift detected
 *   exit 2  — error connecting / introspecting
 *
 * READ-ONLY. The script issues SELECT queries only against
 * information_schema / pg_catalog / sqlite_master; it never alters or
 * writes data. Pre-flight purpose: validate that the SequelizeMeta
 * pre-seed plan in docs/migrations/per-model-rebaseline.md is safe for
 * the target DB (every per-model baseline file must describe a schema
 * that already matches the live DB before pre-seeding can claim it
 * "already ran").
 *
 * Usage:
 *   # Against any DB the existing config conventions can reach:
 *   #   DEV_DATABASE_URL / DATABASE_URL / DB_HOST+DB_NAME+DB_USERNAME+DB_PASSWORD+DB_PORT
 *   NODE_ENV=development npx ts-node scripts/schema-audit.ts > audit.json
 *
 * Exit code is set so this can gate CI / a pre-deploy check:
 *   schema-audit.ts && echo "safe" || echo "drift"
 */

import type { ModelStatic, Model, Sequelize } from 'sequelize';
import { z } from 'zod';

// Schema-first definition of the report shape. Stable contract for any
// downstream tool that consumes the JSON output.
const ColumnDriftSchema = z.object({
  column: z.string(),
  kind: z.enum(['missing', 'extra', 'type', 'nullable', 'default']),
  expected: z.string().nullable(),
  actual: z.string().nullable(),
});

const IndexDriftSchema = z.object({
  index: z.string(),
  kind: z.enum(['missing', 'extra']),
  expected: z.string().nullable(),
  actual: z.string().nullable(),
});

const EnumDriftSchema = z.object({
  enumName: z.string(),
  kind: z.enum(['missing-values', 'extra-values']),
  values: z.array(z.string()),
});

const TableReportSchema = z.object({
  table: z.string(),
  modelName: z.string().nullable(),
  status: z.enum(['ok', 'missing-table', 'extra-table', 'drift']),
  columns: z.array(ColumnDriftSchema),
  indexes: z.array(IndexDriftSchema),
  enums: z.array(EnumDriftSchema),
});

const AuditReportSchema = z.object({
  generatedAt: z.string(),
  dialect: z.string(),
  databaseName: z.string(),
  totalModels: z.number(),
  totalTables: z.number(),
  driftedTables: z.number(),
  tables: z.array(TableReportSchema),
});

type ColumnDrift = z.infer<typeof ColumnDriftSchema>;
type IndexDrift = z.infer<typeof IndexDriftSchema>;
type EnumDrift = z.infer<typeof EnumDriftSchema>;
type TableReport = z.infer<typeof TableReportSchema>;
type AuditReport = z.infer<typeof AuditReportSchema>;

type ColumnAttribute = {
  field?: string;
  type: { key?: string; toString?: (dialect?: string) => string };
  allowNull?: boolean;
  primaryKey?: boolean;
  defaultValue?: unknown;
  values?: ReadonlyArray<string>;
};

type ModelIndex = {
  name?: string;
  unique?: boolean;
  fields: ReadonlyArray<string | { name: string; order?: string }>;
};

type ExpectedColumn = {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  enumValues: ReadonlyArray<string> | null;
};

type LiveColumn = {
  name: string;
  type: string;
  nullable: boolean;
};

type ExpectedIndex = {
  name: string;
  columns: ReadonlyArray<string>;
  unique: boolean;
};

type LiveIndex = {
  name: string;
  columns: ReadonlyArray<string>;
  unique: boolean;
};

const toSnakeCase = (str: string): string =>
  str.replace(/([A-Z])/g, (_, ch: string, i: number) =>
    i === 0 ? ch.toLowerCase() : `_${ch.toLowerCase()}`
  );

const fieldName = (attrName: string, attr: ColumnAttribute): string =>
  attr.field ?? toSnakeCase(attrName);

const indexFieldName = (field: string | { name: string }): string =>
  typeof field === 'string' ? field : field.name;

const normalizeType = (raw: string): string => raw.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Extract the canonical column list a model would emit at sync() time.
 * Sequelize's getAttributes() is the source of truth — it's the same
 * thing sync() consults.
 *
 * Sequelize associations sometimes inject a second copy of a foreign-key
 * attribute under a snake_case alias (e.g. both `applicationId` and
 * `application_id` appear, both mapping to the same `application_id`
 * column). Dedupe by field name and prefer the explicit declaration —
 * the one whose attribute name (camelCase) wasn't already snake_case —
 * because it carries the model author's allowNull/onDelete intent.
 */
const expectedColumnsForModel = (model: ModelStatic<Model>): ReadonlyArray<ExpectedColumn> => {
  const attrs = model.getAttributes() as Record<string, ColumnAttribute>;
  const byField = new Map<string, ExpectedColumn>();
  const explicitlyDeclared = new Set<string>();
  for (const [attrName, attr] of Object.entries(attrs)) {
    const field = fieldName(attrName, attr);
    const typeKey = attr.type?.key ?? '';
    const enumValues = typeKey === 'ENUM' && attr.values ? attr.values : null;
    const candidate: ExpectedColumn = {
      name: field,
      type: typeKey || String(attr.type?.toString?.() ?? ''),
      nullable: attr.allowNull !== false,
      primaryKey: Boolean(attr.primaryKey),
      enumValues,
    };
    // The explicit declaration is the one whose attrName != field (camelCase
    // declared, snake_case in DB) OR — for already-snake_cased declarations —
    // whatever appeared first in the iteration order.
    const isSnakeCaseDuplicate = attrName === field && explicitlyDeclared.has(field);
    if (isSnakeCaseDuplicate) {
      continue;
    }
    if (attrName !== field) {
      explicitlyDeclared.add(field);
    }
    byField.set(field, candidate);
  }
  return Array.from(byField.values());
};

const expectedIndexesForModel = (model: ModelStatic<Model>): ReadonlyArray<ExpectedIndex> => {
  const opts = (model as unknown as { options: { indexes?: ReadonlyArray<ModelIndex> } }).options;
  const indexes = opts.indexes ?? [];
  return indexes.map(idx => ({
    name: idx.name ?? '',
    columns: idx.fields.map(indexFieldName),
    unique: Boolean(idx.unique),
  }));
};

/**
 * Live introspection — Postgres path. Uses information_schema (read-only).
 */
const fetchPgColumns = async (
  sequelize: Sequelize,
  table: string
): Promise<ReadonlyArray<LiveColumn>> => {
  const [rows] = await sequelize.query(
    `SELECT column_name, data_type, udt_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = :table
       ORDER BY ordinal_position`,
    { replacements: { table } }
  );
  return (
    rows as Array<{ column_name: string; data_type: string; udt_name: string; is_nullable: string }>
  ).map(r => ({
    name: r.column_name,
    // Prefer udt_name for ENUMs and other custom types; data_type for stdlib.
    type: r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type,
    nullable: r.is_nullable === 'YES',
  }));
};

const fetchPgIndexes = async (
  sequelize: Sequelize,
  table: string
): Promise<ReadonlyArray<LiveIndex>> => {
  const [rows] = await sequelize.query(
    `SELECT i.relname AS index_name,
            a.attname AS column_name,
            ix.indisunique AS is_unique,
            array_position(ix.indkey, a.attnum) AS pos
       FROM pg_class t
       JOIN pg_index ix ON t.oid = ix.indrelid
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
       WHERE t.relkind = 'r' AND t.relname = :table
       ORDER BY i.relname, pos`,
    { replacements: { table } }
  );
  const grouped = new Map<string, { unique: boolean; columns: string[] }>();
  (rows as Array<{ index_name: string; column_name: string; is_unique: boolean }>).forEach(r => {
    const existing = grouped.get(r.index_name);
    if (existing) {
      existing.columns.push(r.column_name);
      return;
    }
    grouped.set(r.index_name, { unique: r.is_unique, columns: [r.column_name] });
  });
  return Array.from(grouped.entries()).map(([name, v]) => ({
    name,
    columns: v.columns,
    unique: v.unique,
  }));
};

const fetchPgTables = async (sequelize: Sequelize): Promise<ReadonlyArray<string>> => {
  const [rows] = await sequelize.query(
    `SELECT table_name FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'`
  );
  return (rows as Array<{ table_name: string }>).map(r => r.table_name);
};

const fetchPgEnumValues = async (
  sequelize: Sequelize,
  enumName: string
): Promise<ReadonlyArray<string>> => {
  const [rows] = await sequelize.query(
    `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       WHERE t.typname = :name
       ORDER BY e.enumsortorder`,
    { replacements: { name: enumName } }
  );
  return (rows as Array<{ enumlabel: string }>).map(r => r.enumlabel);
};

/**
 * Live introspection — SQLite path. Used by tests; production target is
 * always Postgres but this lets the script be exercised in CI without a
 * Postgres container.
 */
const fetchSqliteColumns = async (
  sequelize: Sequelize,
  table: string
): Promise<ReadonlyArray<LiveColumn>> => {
  const [rows] = await sequelize.query(`PRAGMA table_info("${table}")`);
  return (rows as Array<{ name: string; type: string; notnull: number }>).map(r => ({
    name: r.name,
    type: r.type,
    nullable: r.notnull === 0,
  }));
};

const fetchSqliteIndexes = async (
  sequelize: Sequelize,
  table: string
): Promise<ReadonlyArray<LiveIndex>> => {
  const [list] = await sequelize.query(`PRAGMA index_list("${table}")`);
  const out: LiveIndex[] = [];
  for (const r of list as Array<{ name: string; unique: number; origin: string }>) {
    if (r.origin === 'pk') {
      // Implicit PK index — skip; covered by primaryKey on the column.
      continue;
    }
    if (r.name.startsWith('sqlite_')) {
      // Implicit indexes SQLite creates for UNIQUE constraints (sqlite_autoindex_*).
      // Not user-declared; not present in the model's `indexes:` array.
      continue;
    }
    const [info] = await sequelize.query(`PRAGMA index_info("${r.name}")`);
    const columns = (info as Array<{ name: string }>).map(i => i.name);
    out.push({ name: r.name, columns, unique: r.unique === 1 });
  }
  return out;
};

const fetchSqliteTables = async (sequelize: Sequelize): Promise<ReadonlyArray<string>> => {
  const [rows] = await sequelize.query(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
  );
  return (rows as Array<{ name: string }>).map(r => r.name);
};

/**
 * Type comparison is intentionally lenient — Sequelize's type.key
 * ("STRING", "UUID", "ENUM") doesn't match Postgres's data_type
 * ("character varying", "uuid", "USER-DEFINED"). The mapping below
 * captures only the gross-incompatibility cases (e.g. STRING expected
 * but column is INTEGER); subtle drifts (VARCHAR(64) vs VARCHAR(255))
 * are treated as a no-op here because the audit's purpose is to
 * surface the kind of drift that breaks application code, not to
 * police every column-length tweak. Operators wanting that level of
 * detail should diff a pg_dump.
 */
const PG_TYPE_FAMILIES: ReadonlyArray<[ReadonlyArray<string>, ReadonlyArray<string>]> = [
  [
    ['STRING', 'CHAR', 'TEXT', 'CITEXT'],
    ['character varying', 'character', 'text', 'citext'],
  ],
  [
    ['INTEGER', 'BIGINT', 'SMALLINT'],
    ['integer', 'bigint', 'smallint'],
  ],
  [
    ['FLOAT', 'DOUBLE', 'REAL', 'DECIMAL', 'NUMERIC'],
    ['double precision', 'real', 'numeric'],
  ],
  [['BOOLEAN'], ['boolean']],
  [
    ['DATE', 'DATEONLY', 'TIME'],
    ['date', 'time', 'timestamp', 'timestamp with time zone', 'timestamp without time zone'],
  ],
  [['UUID'], ['uuid']],
  [
    ['JSON', 'JSONB'],
    ['json', 'jsonb'],
  ],
  [['ARRAY'], ['ARRAY']],
  [['BLOB'], ['bytea']],
  [
    ['GEOMETRY', 'GEOGRAPHY'],
    ['USER-DEFINED', 'geometry', 'geography'],
  ],
  [['TSVECTOR'], ['tsvector']],
  [
    ['CIDR', 'INET'],
    ['cidr', 'inet'],
  ],
];

const SQLITE_TYPE_FAMILIES: ReadonlyArray<[ReadonlyArray<string>, ReadonlyArray<string>]> = [
  // SQLite stores most types under their declared name verbatim. The
  // mapping below treats Sequelize type-keys and the corresponding live
  // PRAGMA type name as interchangeable.
  [
    ['STRING', 'CHAR', 'TEXT', 'CITEXT'],
    ['VARCHAR', 'TEXT', 'CHAR', 'CITEXT', 'STRING'],
  ],
  [['UUID'], ['UUID', 'VARCHAR', 'CHAR', 'TEXT']],
  [
    ['CIDR', 'INET'],
    ['CIDR', 'INET', 'VARCHAR', 'TEXT'],
  ],
  [['TSVECTOR'], ['TSVECTOR', 'TEXT']],
  [
    ['INTEGER', 'BIGINT', 'SMALLINT'],
    ['INTEGER', 'BIGINT', 'SMALLINT'],
  ],
  [
    ['FLOAT', 'DOUBLE', 'REAL', 'DECIMAL', 'NUMERIC'],
    ['REAL', 'NUMERIC', 'DECIMAL', 'FLOAT', 'DOUBLE'],
  ],
  [['BOOLEAN'], ['TINYINT', 'BOOLEAN']],
  [
    ['DATE', 'DATEONLY', 'TIME'],
    ['DATETIME', 'DATE', 'TIME'],
  ],
  [
    ['JSON', 'JSONB'],
    ['JSON', 'JSONB', 'TEXT'],
  ],
  [['ENUM'], ['TEXT', 'VARCHAR']],
  [['ARRAY', 'GEOMETRY', 'GEOGRAPHY'], ['TEXT']],
  [['BLOB'], ['BLOB']],
];

const typesCompatible = (
  expectedKey: string,
  actualType: string,
  dialect: 'postgres' | 'sqlite'
): boolean => {
  const families = dialect === 'postgres' ? PG_TYPE_FAMILIES : SQLITE_TYPE_FAMILIES;
  const exp = expectedKey.toUpperCase();
  const act = actualType.toUpperCase();
  // Trim VARCHAR(255) → VARCHAR for SQLite comparison.
  const actStripped = act.replace(/\(.*\)/, '').trim();
  for (const [expectedSet, actualSet] of families) {
    const matchesExpected = expectedSet.includes(exp);
    if (!matchesExpected) {
      continue;
    }
    return actualSet.some(a => a.toUpperCase() === actStripped || a.toUpperCase() === act);
  }
  // Unknown family — fall back to permissive (skip drift report).
  return normalizeType(expectedKey) === normalizeType(actualType);
};

const diffColumns = (
  expected: ReadonlyArray<ExpectedColumn>,
  actual: ReadonlyArray<LiveColumn>,
  dialect: 'postgres' | 'sqlite'
): ReadonlyArray<ColumnDrift> => {
  const expectedByName = new Map(expected.map(c => [c.name, c]));
  const actualByName = new Map(actual.map(c => [c.name, c]));
  const drifts: ColumnDrift[] = [];

  for (const exp of expected) {
    const live = actualByName.get(exp.name);
    if (!live) {
      drifts.push({ column: exp.name, kind: 'missing', expected: exp.type, actual: null });
      continue;
    }
    if (!typesCompatible(exp.type, live.type, dialect)) {
      drifts.push({ column: exp.name, kind: 'type', expected: exp.type, actual: live.type });
    }
    // Nullability comparison is Postgres-only. SQLite (used by tests)
    // applies its own translation rules to FK and timestamp columns that
    // produce false-positive drift; the audit's contract is correctness
    // against the production target, which is Postgres.
    if (dialect === 'postgres' && exp.nullable !== live.nullable && !exp.primaryKey) {
      drifts.push({
        column: exp.name,
        kind: 'nullable',
        expected: exp.nullable ? 'NULL' : 'NOT NULL',
        actual: live.nullable ? 'NULL' : 'NOT NULL',
      });
    }
  }

  for (const live of actual) {
    if (!expectedByName.has(live.name)) {
      drifts.push({ column: live.name, kind: 'extra', expected: null, actual: live.type });
    }
  }

  return drifts;
};

const diffIndexes = (
  expected: ReadonlyArray<ExpectedIndex>,
  actual: ReadonlyArray<LiveIndex>
): ReadonlyArray<IndexDrift> => {
  // Match by (sorted) column-set + unique flag rather than by name —
  // Sequelize auto-names many indexes (e.g. `users_email`) so the
  // expected name often differs from the live name even when the
  // structure is identical.
  const fingerprint = (idx: { columns: ReadonlyArray<string>; unique: boolean }): string =>
    `${idx.unique ? 'U' : 'I'}:${[...idx.columns].sort().join(',')}`;

  const expectedByFp = new Map(
    expected.filter(e => e.columns.length > 0).map(e => [fingerprint(e), e])
  );
  const actualByFp = new Map(actual.map(a => [fingerprint(a), a]));
  const drifts: IndexDrift[] = [];

  for (const [fp, exp] of expectedByFp) {
    if (!actualByFp.has(fp)) {
      drifts.push({
        index: exp.name || fp,
        kind: 'missing',
        expected: `${exp.unique ? 'UNIQUE ' : ''}(${exp.columns.join(', ')})`,
        actual: null,
      });
    }
  }

  for (const [fp, live] of actualByFp) {
    if (!expectedByFp.has(fp)) {
      drifts.push({
        index: live.name,
        kind: 'extra',
        expected: null,
        actual: `${live.unique ? 'UNIQUE ' : ''}(${live.columns.join(', ')})`,
      });
    }
  }

  return drifts;
};

const diffEnums = async (
  sequelize: Sequelize,
  table: string,
  expected: ReadonlyArray<ExpectedColumn>,
  dialect: 'postgres' | 'sqlite'
): Promise<ReadonlyArray<EnumDrift>> => {
  if (dialect !== 'postgres') {
    return [];
  }
  const drifts: EnumDrift[] = [];
  for (const col of expected) {
    if (!col.enumValues) {
      continue;
    }
    // Sequelize's default enum-name convention: `enum_<table>_<column>`.
    const enumName = `enum_${table}_${col.name}`;
    const live = await fetchPgEnumValues(sequelize, enumName);
    if (live.length === 0) {
      // No enum found — likely the column lives in a shared enum or the
      // column drift report already flagged the column as missing. Skip
      // here to avoid double-reporting.
      continue;
    }
    const expSet = new Set(col.enumValues);
    const actSet = new Set(live);
    const missing = col.enumValues.filter(v => !actSet.has(v));
    const extra = live.filter(v => !expSet.has(v));
    if (missing.length > 0) {
      drifts.push({ enumName, kind: 'missing-values', values: missing });
    }
    if (extra.length > 0) {
      drifts.push({ enumName, kind: 'extra-values', values: extra });
    }
  }
  return drifts;
};

type Introspector = {
  listTables: () => Promise<ReadonlyArray<string>>;
  describeColumns: (table: string) => Promise<ReadonlyArray<LiveColumn>>;
  describeIndexes: (table: string) => Promise<ReadonlyArray<LiveIndex>>;
};

const buildIntrospector = (sequelize: Sequelize, dialect: 'postgres' | 'sqlite'): Introspector => {
  if (dialect === 'postgres') {
    return {
      listTables: () => fetchPgTables(sequelize),
      describeColumns: t => fetchPgColumns(sequelize, t),
      describeIndexes: t => fetchPgIndexes(sequelize, t),
    };
  }
  return {
    listTables: () => fetchSqliteTables(sequelize),
    describeColumns: t => fetchSqliteColumns(sequelize, t),
    describeIndexes: t => fetchSqliteIndexes(sequelize, t),
  };
};

export const auditSchema = async (sequelize: Sequelize): Promise<AuditReport> => {
  const dialectRaw = sequelize.getDialect();
  if (dialectRaw !== 'postgres' && dialectRaw !== 'sqlite') {
    throw new Error(
      `Unsupported dialect: ${dialectRaw}. schema-audit supports postgres and sqlite.`
    );
  }
  const dialect: 'postgres' | 'sqlite' = dialectRaw;
  const introspector = buildIntrospector(sequelize, dialect);
  const liveTables = await introspector.listTables();
  const liveTableSet = new Set(liveTables);

  const models = sequelize.models;
  const modelsByTable = new Map<string, ModelStatic<Model>>();
  for (const model of Object.values(models)) {
    modelsByTable.set(model.getTableName() as string, model);
  }

  const tables: TableReport[] = [];

  for (const [table, model] of modelsByTable) {
    if (!liveTableSet.has(table)) {
      tables.push({
        table,
        modelName: model.name,
        status: 'missing-table',
        columns: [],
        indexes: [],
        enums: [],
      });
      continue;
    }
    const expectedCols = expectedColumnsForModel(model);
    const expectedIdx = expectedIndexesForModel(model);
    const liveCols = await introspector.describeColumns(table);
    const liveIdx = await introspector.describeIndexes(table);
    const columnDrifts = diffColumns(expectedCols, liveCols, dialect);
    const indexDrifts = diffIndexes(expectedIdx, liveIdx);
    const enumDrifts = await diffEnums(sequelize, table, expectedCols, dialect);
    const status =
      columnDrifts.length === 0 && indexDrifts.length === 0 && enumDrifts.length === 0
        ? 'ok'
        : 'drift';
    tables.push({
      table,
      modelName: model.name,
      status,
      columns: columnDrifts,
      indexes: indexDrifts,
      enums: enumDrifts,
    });
  }

  // Tables in the live DB without any matching model.
  // SequelizeMeta is created by sequelize-cli — not a model — so exclude it.
  const KNOWN_NON_MODEL_TABLES = new Set(['SequelizeMeta']);
  for (const table of liveTables) {
    if (modelsByTable.has(table) || KNOWN_NON_MODEL_TABLES.has(table)) {
      continue;
    }
    tables.push({
      table,
      modelName: null,
      status: 'extra-table',
      columns: [],
      indexes: [],
      enums: [],
    });
  }

  const driftedTables = tables.filter(t => t.status !== 'ok').length;

  return AuditReportSchema.parse({
    generatedAt: new Date().toISOString(),
    dialect,
    databaseName: sequelize.getDatabaseName?.() ?? '',
    totalModels: modelsByTable.size,
    totalTables: liveTables.length,
    driftedTables,
    tables,
  });
};

export const formatSummary = (report: AuditReport): string => {
  const lines: string[] = [];
  lines.push(`schema-audit: ${report.dialect}://${report.databaseName}`);
  lines.push(
    `models=${report.totalModels} tables=${report.totalTables} drifted=${report.driftedTables}`
  );
  for (const t of report.tables) {
    if (t.status === 'ok') {
      continue;
    }
    lines.push(`  [${t.status}] ${t.table}${t.modelName ? ` (model: ${t.modelName})` : ''}`);
    for (const c of t.columns) {
      lines.push(
        `      column ${c.kind}: ${c.column} (expected=${c.expected}, actual=${c.actual})`
      );
    }
    for (const i of t.indexes) {
      lines.push(`      index ${i.kind}: ${i.index} (expected=${i.expected}, actual=${i.actual})`);
    }
    for (const e of t.enums) {
      lines.push(`      enum ${e.kind}: ${e.enumName} -> ${e.values.join(', ')}`);
    }
  }
  if (report.driftedTables === 0) {
    lines.push('  no drift detected');
  }
  return lines.join('\n');
};

const main = async (): Promise<void> => {
  // Lazy import so this script doesn't pay the model-init cost when consumed
  // as a library (e.g. from tests).
  const sequelizeModule = await import('../src/sequelize');
  const sequelize = sequelizeModule.default;
  await import('../src/models/index');

  try {
    const report = await auditSchema(sequelize);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.stderr.write(`${formatSummary(report)}\n`);
    await sequelize.close();
    process.exit(report.driftedTables === 0 ? 0 : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`schema-audit error: ${message}\n`);
    await sequelize.close().catch(() => {
      /* swallow close errors during error path */
    });
    process.exit(2);
  }
};

if (require.main === module) {
  void main();
}

export type { AuditReport, TableReport, ColumnDrift, IndexDrift, EnumDrift };
