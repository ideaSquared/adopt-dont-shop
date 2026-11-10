import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { applyApplicantProfileChange } from './applicant-updates.js';

const makePool = () => {
  const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });
  return { pool: { query } as unknown as Pool, query };
};

describe('applyApplicantProfileChange', () => {
  it("rewrites the applicant's name and email on all their applications", async () => {
    const { pool, query } = makePool();

    await applyApplicantProfileChange(pool, {
      userId: 'usr-1',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      updatedAt: '2026-03-01T10:00:00.000Z',
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(
      /SET applicant_name = \$1, applicant_email = \$2, applicant_synced_at = \$3/
    );
    expect(sql).toMatch(/WHERE user_id = \$4/);
    expect(params).toEqual([
      'Jane Smith',
      'jane.smith@example.com',
      '2026-03-01T10:00:00.000Z',
      'usr-1',
    ]);
  });

  it('only applies a change newer than the one already stored', async () => {
    const { pool, query } = makePool();

    await applyApplicantProfileChange(pool, {
      userId: 'usr-1',
      firstName: 'Jane',
      lastName: '',
      email: 'jane@example.com',
      updatedAt: '2026-03-01T10:00:00.000Z',
    });

    expect(query.mock.calls[0][0]).toMatch(
      /applicant_synced_at IS NULL OR applicant_synced_at < \$3/
    );
    expect(query.mock.calls[0][1][0]).toBe('Jane');
  });

  it('ignores malformed events', async () => {
    const { pool, query } = makePool();

    await applyApplicantProfileChange(pool, { userId: 'usr-1', email: 'x@example.com' });
    await applyApplicantProfileChange(pool, {
      userId: 'usr-1',
      email: 'x@example.com',
      updatedAt: 'yesterday',
    });
    await applyApplicantProfileChange(pool, null);

    expect(query).not.toHaveBeenCalled();
  });
});
