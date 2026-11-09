import { describe, expect, it, vi } from 'vitest';

import { down, up } from './038_add_pending_email_change.js';

const makePgm = () => ({
  addColumns: vi.fn(),
  dropColumns: vi.fn(),
  createIndex: vi.fn(),
  dropIndex: vi.fn(),
});

describe('038_add_pending_email_change', () => {
  it('adds nullable pending-email columns, so existing accounts have no change in flight', async () => {
    const pgm = makePgm();
    await up(pgm as never);
    expect(pgm.addColumns).toHaveBeenCalledWith('users', {
      pending_email: { type: 'public.citext' },
      email_change_token_hash: { type: 'varchar(64)' },
      email_change_expires_at: { type: 'timestamptz' },
    });
  });

  it('indexes only the rows that have a confirmation token outstanding', async () => {
    const pgm = makePgm();
    await up(pgm as never);
    expect(pgm.createIndex).toHaveBeenCalledWith(
      'users',
      'email_change_token_hash',
      expect.objectContaining({ where: 'email_change_token_hash IS NOT NULL' })
    );
  });

  it('down drops the index and the columns', async () => {
    const pgm = makePgm();
    await down(pgm as never);
    expect(pgm.dropIndex).toHaveBeenCalled();
    expect(pgm.dropColumns).toHaveBeenCalledWith('users', [
      'pending_email',
      'email_change_token_hash',
      'email_change_expires_at',
    ]);
  });
});
