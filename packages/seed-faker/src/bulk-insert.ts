/**
 * Batched multi-row INSERT helper for the spam seeders.
 *
 * Rows are grouped into chunks; each chunk becomes one parameterised
 * `INSERT INTO t (cols) VALUES (...), (...)` statement with placeholders
 * re-numbered from $1. Chunking keeps any single statement well under
 * Postgres's 65535-bound parameter limit and bounds memory per round-trip.
 */

export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

export type BulkInsertDeps = {
  query: QueryFn;
};

export const bulkInsert = async (
  deps: BulkInsertDeps,
  table: string,
  columns: readonly string[],
  rows: readonly (readonly unknown[])[],
  chunkSize = 500,
  conflictClause = ''
): Promise<number> => {
  if (rows.length === 0) {
    return 0;
  }

  const columnList = columns.join(', ');
  const suffix = conflictClause ? ` ${conflictClause}` : '';

  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const values: unknown[] = [];
    const tuples = chunk.map(row => {
      const placeholders = row.map(value => {
        values.push(value);
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    const sql = `INSERT INTO ${table} (${columnList}) VALUES ${tuples.join(', ')}${suffix}`;
    await deps.query(sql, values);
  }

  return rows.length;
};
