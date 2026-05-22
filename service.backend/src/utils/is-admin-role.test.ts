import { UserType } from '../models/User';
import { isAdminRole } from './is-admin-role';

describe('isAdminRole', () => {
  it('returns true for ADMIN', () => {
    expect(isAdminRole(UserType.ADMIN)).toBe(true);
  });

  it('returns true for SUPER_ADMIN', () => {
    expect(isAdminRole(UserType.SUPER_ADMIN)).toBe(true);
  });

  it('returns false for ADOPTER', () => {
    expect(isAdminRole(UserType.ADOPTER)).toBe(false);
  });

  it('returns false for RESCUE_STAFF', () => {
    expect(isAdminRole(UserType.RESCUE_STAFF)).toBe(false);
  });

  it('returns false for MODERATOR', () => {
    expect(isAdminRole(UserType.MODERATOR)).toBe(false);
  });

  it('returns false for SUPPORT_AGENT', () => {
    expect(isAdminRole(UserType.SUPPORT_AGENT)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAdminRole(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAdminRole(null)).toBe(false);
  });

  it('returns false for unknown string', () => {
    expect(isAdminRole('something-else')).toBe(false);
  });
});
