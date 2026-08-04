import { describe, expect, it } from 'vitest';

import { resolveFieldAccessMap } from './field-access.js';

describe('resolveFieldAccessMap', () => {
  it("returns the lib.types default access map for a single role's field permissions", () => {
    const map = resolveFieldAccessMap('users', ['admin']);
    expect(map.firstName).toBe('write');
    expect(map.userId).toBe('read');
  });

  it('unions multiple roles by taking the most permissive level per field', () => {
    // moderator.firstName is 'read', adopter.firstName is 'write' — the
    // union of both roles must resolve to the more permissive 'write'.
    const map = resolveFieldAccessMap('users', ['moderator', 'adopter']);
    expect(map.firstName).toBe('write');
  });

  it('unions in the other direction too (order-independent)', () => {
    const map = resolveFieldAccessMap('users', ['adopter', 'moderator']);
    expect(map.firstName).toBe('write');
  });

  it('returns no readable/writable fields when given no roles (secure by default)', () => {
    // enforceSensitiveDenylist always stamps the denylisted fields onto the
    // map (defense in depth), so the map isn't literally {} — but nothing
    // in it is readable or writable.
    const map = resolveFieldAccessMap('users', []);
    expect(Object.values(map).every(level => level === 'none')).toBe(true);
  });

  it('returns a genuinely empty map for a resource with no sensitive denylist entries', () => {
    expect(resolveFieldAccessMap('pets', [])).toEqual({});
  });

  it('layers supplied overrides on top of the role defaults, most-permissive wins', () => {
    // moderator.phoneNumber defaults to 'none'; an override granting 'read'
    // must win over the default.
    const map = resolveFieldAccessMap('users', ['moderator'], { phoneNumber: 'read' });
    expect(map.phoneNumber).toBe('read');
  });

  it('an override cannot loosen access below what the default already grants', () => {
    // admin.firstName defaults to 'write'; an override of 'read' must not
    // downgrade it — most-permissive-wins applies to overrides too.
    const map = resolveFieldAccessMap('users', ['admin'], { firstName: 'read' });
    expect(map.firstName).toBe('write');
  });

  it('re-enforces the sensitive-field denylist even when an override tries to loosen it', () => {
    const map = resolveFieldAccessMap('users', ['admin'], { password: 'write' });
    expect(map.password).toBe('none');
  });

  it('never elevates a sensitive field regardless of role union', () => {
    const map = resolveFieldAccessMap('users', ['admin', 'super_admin']);
    expect(map.password).toBe('none');
    expect(map.resetToken).toBe('none');
  });
});
