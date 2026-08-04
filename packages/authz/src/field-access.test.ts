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

  it('an override can loosen access beyond what the role default grants', () => {
    // moderator.phoneNumber defaults to 'none'; an admin-configured
    // override granting 'read' must take effect.
    const map = resolveFieldAccessMap('users', ['moderator'], { phoneNumber: 'read' });
    expect(map.phoneNumber).toBe('read');
  });

  it('an override can RESTRICT access below what the role default grants', () => {
    // admin.firstName defaults to 'write'. Overrides take precedence
    // over the role union rather than most-permissive-wins, so an admin
    // can tighten a field the role default would otherwise expose — the
    // whole point of the Field Permissions admin UI. If overrides could
    // only loosen, the UI could never restrict anything and ADS-1037's
    // phantom-control problem would persist even with enforcement wired
    // up.
    const map = resolveFieldAccessMap('users', ['admin'], { firstName: 'none' });
    expect(map.firstName).toBe('none');
  });

  it('an override replaces (does not union with) the role-default level', () => {
    // rescue_staff.email defaults to 'read'; an override of 'write' must
    // apply exactly as configured, not merge with the default via
    // most-permissive-wins (which would happen to produce the same
    // result here, but for the wrong reason — assert 'none' too, which a
    // permissive union could never produce from a 'read' default).
    expect(resolveFieldAccessMap('users', ['rescue_staff'], { email: 'write' }).email).toBe(
      'write'
    );
    expect(resolveFieldAccessMap('users', ['rescue_staff'], { email: 'none' }).email).toBe('none');
  });

  it("role-union among a principal's own roles is still most-permissive-wins (unaffected by the override precedence change)", () => {
    // moderator.firstName is 'read', adopter.firstName is 'write' — no
    // override supplied, so the two roles still union to the more
    // permissive level.
    const map = resolveFieldAccessMap('users', ['moderator', 'adopter']);
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
