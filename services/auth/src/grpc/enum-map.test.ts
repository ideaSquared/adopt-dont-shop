import { describe, expect, it } from 'vitest';

import { AuthV1 } from '@adopt-dont-shop/proto';

import {
  ALL_USER_ROLES_DB,
  ALL_USER_STATUSES,
  roleFromDb,
  roleToDb,
  statusFromDb,
  statusToDb,
} from './enum-map.js';

describe('UserRole enum mapping', () => {
  it.each(ALL_USER_ROLES_DB)('round-trips %s', db => {
    expect(roleFromDb(roleToDb(roleFromDb(db)))).toBe(roleFromDb(db));
  });

  it('throws when given the UNSPECIFIED proto sentinel', () => {
    expect(() => roleToDb(AuthV1.UserRole.USER_ROLE_UNSPECIFIED)).toThrowError();
  });

  it('throws on an unknown DB value', () => {
    expect(() => roleFromDb('not_a_role')).toThrowError();
  });

  it('covers every db variant — exhaustiveness check', () => {
    // The proto enum's populated variants and the DB enum's variants
    // must be 1:1. A new value added to one but not the other fails
    // here.
    const protoPopulated = Object.values(AuthV1.UserRole).filter(
      v => typeof v === 'number' && v > 0
    );
    expect(protoPopulated).toHaveLength(ALL_USER_ROLES_DB.length);
  });
});

describe('UserStatus enum mapping', () => {
  it.each(ALL_USER_STATUSES)('round-trips %s', db => {
    expect(statusFromDb(statusToDb(statusFromDb(db)))).toBe(statusFromDb(db));
  });

  it('throws when given the UNSPECIFIED proto sentinel', () => {
    expect(() => statusToDb(AuthV1.UserStatus.USER_STATUS_UNSPECIFIED)).toThrowError();
  });

  it('throws on an unknown DB value', () => {
    expect(() => statusFromDb('not_a_status')).toThrowError();
  });

  it('covers every db variant — exhaustiveness check', () => {
    const protoPopulated = Object.values(AuthV1.UserStatus).filter(
      v => typeof v === 'number' && v > 0
    );
    expect(protoPopulated).toHaveLength(ALL_USER_STATUSES.length);
  });
});
