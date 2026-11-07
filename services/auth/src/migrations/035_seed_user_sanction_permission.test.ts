import { describe, expect, it, vi } from 'vitest';

import { down, up } from './035_seed_user_sanction_permission.js';

function makePgm() {
  const calls: string[] = [];
  const pgm = { sql: vi.fn((text: string) => calls.push(text)) };
  return { pgm, calls };
}

describe('035_seed_user_sanction_permission', () => {
  it('registers moderation.users.sanction', async () => {
    const { pgm, calls } = makePgm();
    await up(pgm as never);
    expect(calls).toContainEqual(
      "INSERT INTO auth.permissions (permission_name) VALUES ('moderation.users.sanction') ON CONFLICT (permission_name) DO NOTHING"
    );
  });

  it('grants it to moderator, admin and super_admin only', async () => {
    const { pgm, calls } = makePgm();
    await up(pgm as never);

    const granted = calls
      .filter(sql => sql.includes('role_permissions'))
      .map(sql => /r\.role_name = '([a-z_]+)'/.exec(sql)?.[1]);
    expect(granted.sort()).toEqual(['admin', 'moderator', 'super_admin']);
  });

  it('down removes only the grants, not the permission row', async () => {
    const { pgm, calls } = makePgm();
    await down(pgm as never);
    expect(calls.every(sql => sql.includes('DELETE FROM auth.role_permissions'))).toBe(true);
    expect(calls).toHaveLength(3);
  });
});
