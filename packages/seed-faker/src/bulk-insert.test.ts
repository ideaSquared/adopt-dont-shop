import { describe, expect, it, vi } from 'vitest';

import { bulkInsert } from './bulk-insert.js';

// bulkInsert turns N rows of column-values into the fewest possible
// parameterised multi-row INSERTs, chunking so a single statement never
// exceeds the chunk size (and, indirectly, Postgres's 65535-parameter cap).
describe('bulkInsert', () => {
  const columns = ['id', 'name'] as const;

  it('issues a single statement when rows fit in one chunk', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const rows = [
      ['a', 'Alice'],
      ['b', 'Bob'],
    ];

    const inserted = await bulkInsert({ query }, 'demo.people', columns, rows, 100);

    expect(inserted).toBe(2);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, values] = query.mock.calls[0];
    expect(sql).toContain('INSERT INTO demo.people (id, name)');
    expect(sql).toContain('($1, $2), ($3, $4)');
    expect(values).toEqual(['a', 'Alice', 'b', 'Bob']);
  });

  it('splits rows across multiple statements at the chunk boundary', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const rows = [
      ['a', 'Alice'],
      ['b', 'Bob'],
      ['c', 'Cara'],
    ];

    const inserted = await bulkInsert({ query }, 'demo.people', columns, rows, 2);

    expect(inserted).toBe(3);
    expect(query).toHaveBeenCalledTimes(2);
    // Each chunk re-numbers placeholders from $1.
    expect(query.mock.calls[0][0]).toContain('($1, $2), ($3, $4)');
    expect(query.mock.calls[0][1]).toEqual(['a', 'Alice', 'b', 'Bob']);
    expect(query.mock.calls[1][0]).toContain('($1, $2)');
    expect(query.mock.calls[1][1]).toEqual(['c', 'Cara']);
  });

  it('appends the supplied conflict clause', async () => {
    const query = vi.fn().mockResolvedValue(undefined);

    await bulkInsert(
      { query },
      'demo.people',
      columns,
      [['a', 'Al']],
      100,
      'ON CONFLICT DO NOTHING'
    );

    expect(query.mock.calls[0][0]).toContain('ON CONFLICT DO NOTHING');
  });

  it('does nothing and issues no query for an empty row set', async () => {
    const query = vi.fn().mockResolvedValue(undefined);

    const inserted = await bulkInsert({ query }, 'demo.people', columns, [], 100);

    expect(inserted).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });
});
