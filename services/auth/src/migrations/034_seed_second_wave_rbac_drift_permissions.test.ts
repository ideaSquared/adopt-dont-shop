import { describe, expect, it, vi } from 'vitest';

import { down, up } from './034_seed_second_wave_rbac_drift_permissions.js';

function makePgm() {
  const calls: string[] = [];
  const pgm = { sql: vi.fn((text: string) => calls.push(text)) };
  return { pgm, calls };
}

describe('034_seed_second_wave_rbac_drift_permissions', () => {
  it('registers every permission it introduces', async () => {
    const { pgm, calls } = makePgm();

    await up(pgm as never);

    for (const permission of [
      'rescues.create',
      'events.read',
      'foster.create',
      'notifications.device-tokens.read',
      'notifications.device-tokens.read:any',
      'notifications.email-prefs.read',
      'notifications.email.send',
      'notifications.prefs.read:any',
      'notifications.cleanup',
      'pets.read:any',
      'matching.swipes.read:any',
      // registry-only — no role grant, but still a known permission string
      'notifications.create',
    ]) {
      expect(calls).toContainEqual(
        `INSERT INTO auth.permissions (permission_name) VALUES ('${permission}') ON CONFLICT (permission_name) DO NOTHING`
      );
    }
  });

  it('grants rescues.create to adopter (self-registration) but not to rescue_staff', async () => {
    const { pgm, calls } = makePgm();

    await up(pgm as never);

    const rescuesCreateGrants = calls.filter(
      sql =>
        sql.includes('role_permissions') && sql.includes("p.permission_name = 'rescues.create'")
    );
    expect(rescuesCreateGrants.some(sql => sql.includes("r.role_name = 'adopter'"))).toBe(true);
    expect(rescuesCreateGrants.some(sql => sql.includes("r.role_name = 'rescue_staff'"))).toBe(
      false
    );
  });

  it('grants events.* and foster.* only to rescue_staff (+ super_admin)', async () => {
    const { pgm, calls } = makePgm();

    await up(pgm as never);

    for (const permission of ['events.read', 'events.create', 'foster.create', 'foster.read']) {
      const grants = calls.filter(
        sql =>
          sql.includes('role_permissions') && sql.includes(`p.permission_name = '${permission}'`)
      );
      expect(grants.some(sql => sql.includes("r.role_name = 'rescue_staff'"))).toBe(true);
      expect(grants.some(sql => sql.includes("r.role_name = 'adopter'"))).toBe(false);
    }
  });

  it('grants the ":any" cross-user escape hatches only to admin/super_admin', async () => {
    const { pgm, calls } = makePgm();

    await up(pgm as never);

    for (const permission of [
      'notifications.device-tokens.read:any',
      'notifications.email-prefs.update:any',
      'notifications.prefs.update:any',
      'pets.read:any',
      'matching.swipes.read:any',
    ]) {
      const grants = calls.filter(
        sql =>
          sql.includes('role_permissions') && sql.includes(`p.permission_name = '${permission}'`)
      );
      const roles = grants.map(sql => /r\.role_name = '([^']+)'/.exec(sql)?.[1]);
      expect(roles.sort()).toEqual(['admin', 'super_admin']);
    }
  });

  it('backfills notifications.update / .delete / .prefs.read / .prefs.update to every role', async () => {
    const { pgm, calls } = makePgm();

    await up(pgm as never);

    for (const permission of [
      'notifications.update',
      'notifications.delete',
      'notifications.prefs.read',
      'notifications.prefs.update',
    ]) {
      const grants = calls.filter(
        sql =>
          sql.includes('role_permissions') && sql.includes(`p.permission_name = '${permission}'`)
      );
      const roles = grants.map(sql => /r\.role_name = '([^']+)'/.exec(sql)?.[1]).sort();
      expect(roles).toEqual(
        ['adopter', 'admin', 'moderator', 'rescue_staff', 'super_admin', 'support_agent'].sort()
      );
    }
  });

  it('does not grant the registry-only notifications.create to any role', async () => {
    const { pgm, calls } = makePgm();

    await up(pgm as never);

    const grants = calls.filter(
      sql =>
        sql.includes('role_permissions') &&
        sql.includes("p.permission_name = 'notifications.create'")
    );
    expect(grants).toHaveLength(0);
  });

  it('down reverses every grant up() made', async () => {
    const { pgm, calls } = makePgm();

    await down(pgm as never);

    expect(calls.length).toBeGreaterThan(0);
    for (const sql of calls) {
      expect(sql).toContain('DELETE FROM auth.role_permissions');
    }
    expect(calls.some(sql => sql.includes("p.permission_name = 'rescues.create'"))).toBe(true);
    expect(calls.some(sql => sql.includes("p.permission_name = 'events.read'"))).toBe(true);
  });
});
