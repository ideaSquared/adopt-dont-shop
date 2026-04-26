import { QueryTypes } from 'sequelize';
import sequelize from '../sequelize';
import logger from '../utils/logger';

/**
 * DB-level CHECK constraints for ISO-coded columns. Sequelize enforces
 * the same regexes via per-column `validate.is`, but those are JS-side
 * only — anything bypassing the ORM (raw bulkInsert, future migrations,
 * COPY) gets no validation. The DB CHECK closes that escape hatch.
 *
 * Postgres-only; SQLite tests no-op. Errors are logged and not
 * re-thrown — these are belt-and-braces invariants, not a hard
 * correctness requirement, so a hook bug shouldn't take down boot.
 *
 * Idempotent via pg_constraint lookup. To add a new ISO column, append
 * an entry to ISO_CHECKS and the next boot installs it.
 */
type IsoCheck = {
  table: string;
  column: string;
  /** Constraint name; must be unique per schema. */
  name: string;
  /** ISO regex (e.g. '^[A-Z]{3}$'). Substituted as a SQL string literal. */
  regex: string;
  /** When true the predicate accepts NULL (column is nullable). */
  nullable: boolean;
};

const ISO_CHECKS: readonly IsoCheck[] = [
  {
    table: 'pets',
    column: 'adoption_fee_currency',
    name: 'pets_adoption_fee_currency_iso_check',
    regex: '^[A-Z]{3}$',
    nullable: true,
  },
  {
    table: 'rescues',
    column: 'country',
    name: 'rescues_country_iso_check',
    regex: '^[A-Z]{2}$',
    nullable: false,
  },
];

const buildPredicate = (check: IsoCheck): string => {
  const col = `"${check.column}"`;
  const matches = `${col} ~ ${sequelize.escape(check.regex)}`;
  return check.nullable ? `${col} IS NULL OR ${matches}` : matches;
};

export const installIsoCheckConstraints = async (): Promise<void> => {
  if (sequelize.getDialect() !== 'postgres') {
    return;
  }

  for (const check of ISO_CHECKS) {
    try {
      const existing = await sequelize.query<{ conname: string }>(
        `SELECT c.conname FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         WHERE t.relname = :table AND c.conname = :name`,
        {
          replacements: { table: check.table, name: check.name },
          type: QueryTypes.SELECT,
        }
      );
      if (existing.length > 0) {
        continue;
      }

      await sequelize.query(
        `ALTER TABLE "${check.table}"
         ADD CONSTRAINT "${check.name}"
         CHECK (${buildPredicate(check)});`
      );
    } catch (err) {
      logger.error(`[iso-check] failed on ${check.table}.${check.column}`, { err });
    }
  }
};
