import { describe, expect, it } from 'vitest';

import { AuthV1 } from '@adopt-dont-shop/proto';

import { roleToApi, rolesToApi, userToApiJson, withApiUser } from './auth-user-json.js';

const baseUser: AuthV1.User = {
  userId: 'usr-1',
  email: 'alex@example.com',
  userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
  status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
  emailVerified: true,
  phoneVerified: false,
  twoFactorEnabled: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('userToApiJson', () => {
  it('maps the proto role + status enums to the canonical DB strings', () => {
    const json = userToApiJson(baseUser);

    expect(json.userType).toBe('adopter');
    expect(json.status).toBe('active');
    // Other fields pass through unchanged from toJSON.
    expect(json.email).toBe('alex@example.com');
    expect(json.userId).toBe('usr-1');
  });

  it.each([
    [AuthV1.UserRole.USER_ROLE_RESCUE_STAFF, 'rescue_staff'],
    [AuthV1.UserRole.USER_ROLE_ADMIN, 'admin'],
    [AuthV1.UserRole.USER_ROLE_MODERATOR, 'moderator'],
    [AuthV1.UserRole.USER_ROLE_SUPER_ADMIN, 'super_admin'],
    [AuthV1.UserRole.USER_ROLE_SUPPORT_AGENT, 'support_agent'],
  ])('maps role %s to %s', (role, expected) => {
    expect(userToApiJson({ ...baseUser, userType: role }).userType).toBe(expected);
  });

  it.each([
    [AuthV1.UserStatus.USER_STATUS_INACTIVE, 'inactive'],
    [AuthV1.UserStatus.USER_STATUS_SUSPENDED, 'suspended'],
    [AuthV1.UserStatus.USER_STATUS_PENDING_VERIFICATION, 'pending_verification'],
    [AuthV1.UserStatus.USER_STATUS_DEACTIVATED, 'deactivated'],
  ])('maps status %s to %s', (status, expected) => {
    expect(userToApiJson({ ...baseUser, status }).status).toBe(expected);
  });
});

describe('roleToApi', () => {
  it('returns the canonical string for a known role', () => {
    expect(roleToApi(AuthV1.UserRole.USER_ROLE_ADOPTER)).toBe('adopter');
  });

  it('returns undefined for the unspecified role', () => {
    expect(roleToApi(AuthV1.UserRole.USER_ROLE_UNSPECIFIED)).toBeUndefined();
  });
});

describe('rolesToApi', () => {
  it('maps known roles and drops unknown/unspecified ones', () => {
    const roles = [
      AuthV1.UserRole.USER_ROLE_ADOPTER,
      AuthV1.UserRole.USER_ROLE_UNSPECIFIED,
      AuthV1.UserRole.USER_ROLE_RESCUE_STAFF,
    ];

    expect(rolesToApi(roles)).toEqual(['adopter', 'rescue_staff']);
  });
});

describe('withApiUser', () => {
  it('replaces the user field with the normalised JSON', () => {
    const result = withApiUser({ tokens: { accessToken: 'a' } }, baseUser);

    expect(result).toEqual({
      tokens: { accessToken: 'a' },
      user: userToApiJson(baseUser),
    });
  });

  it('is a no-op when no user is present', () => {
    const json = { permissions: ['pets.read'] };

    expect(withApiUser(json, undefined)).toBe(json);
  });
});
