import { describe, expect, it, vi } from 'vitest';

import { down, up } from './039_seed_chat_moderation_permissions.js';

function makePgm() {
  const calls: string[] = [];
  const pgm = { sql: vi.fn((text: string) => calls.push(text)) };
  return { pgm, calls };
}

const grantsOf = (calls: string[], permission: string): Array<string | undefined> =>
  calls
    .filter(sql => sql.includes('role_permissions') && sql.includes(`'${permission}'`))
    .map(sql => /r\.role_name = '([a-z_]+)'/.exec(sql)?.[1])
    .sort();

describe('039_seed_chat_moderation_permissions', () => {
  it('registers both chat moderation permissions', async () => {
    const { pgm, calls } = makePgm();
    await up(pgm as never);
    expect(calls).toContainEqual(
      "INSERT INTO auth.permissions (permission_name) VALUES ('chats.update') ON CONFLICT (permission_name) DO NOTHING"
    );
    expect(calls).toContainEqual(
      "INSERT INTO auth.permissions (permission_name) VALUES ('chat.moderate:any') ON CONFLICT (permission_name) DO NOTHING"
    );
  });

  it('keeps default behaviour: rescue_staff get chats.update; moderator and admin get chat.moderate:any', async () => {
    const { pgm, calls } = makePgm();
    await up(pgm as never);
    expect(grantsOf(calls, 'chats.update')).toEqual(['rescue_staff', 'super_admin']);
    expect(grantsOf(calls, 'chat.moderate:any')).toEqual(['admin', 'moderator', 'super_admin']);
  });

  it('down removes only grants, not permission rows', async () => {
    const { pgm, calls } = makePgm();
    await down(pgm as never);
    expect(calls.every(sql => sql.includes('DELETE FROM auth.role_permissions'))).toBe(true);
    expect(calls).toHaveLength(5);
  });
});
