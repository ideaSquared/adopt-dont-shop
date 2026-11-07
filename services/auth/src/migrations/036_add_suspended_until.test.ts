import { describe, expect, it, vi } from 'vitest';

import { down, up } from './036_add_suspended_until.js';

const makePgm = () => ({
  addColumn: vi.fn(),
  dropColumn: vi.fn(),
  createIndex: vi.fn(),
  dropIndex: vi.fn(),
});

describe('036_add_suspended_until', () => {
  it('adds a nullable timestamptz suspended_until, so existing suspensions stay indefinite', async () => {
    const pgm = makePgm();
    await up(pgm as never);
    expect(pgm.addColumn).toHaveBeenCalledWith('users', {
      suspended_until: { type: 'timestamptz' },
    });
  });

  it('indexes only suspended users that have an end time', async () => {
    const pgm = makePgm();
    await up(pgm as never);
    expect(pgm.createIndex).toHaveBeenCalledWith(
      'users',
      'suspended_until',
      expect.objectContaining({
        where: "status = 'suspended' AND suspended_until IS NOT NULL",
      })
    );
  });

  it('down drops the index and the column', async () => {
    const pgm = makePgm();
    await down(pgm as never);
    expect(pgm.dropIndex).toHaveBeenCalled();
    expect(pgm.dropColumn).toHaveBeenCalledWith('users', 'suspended_until');
  });
});
