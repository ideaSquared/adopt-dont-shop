import { vi } from 'vitest';
import {
  getCachedUser,
  setCachedUser,
  invalidateAuthCache,
  resetAuthCacheForTests,
} from '../../lib/auth-cache';
import type User from '../../models/User';

// We don't need a real Sequelize User instance — the cache stores by reference,
// so any object that satisfies the type at the call site works.
const fakeUser = (userId: string): User =>
  ({ userId, status: 'active', userType: 'adopter' }) as unknown as User;

describe('auth-cache [ADS-253]', () => {
  beforeEach(() => {
    resetAuthCacheForTests();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for an uncached user', () => {
    expect(getCachedUser('user-1')).toBeNull();
  });

  it('returns the cached user within the TTL window', () => {
    const user = fakeUser('user-1');
    setCachedUser('user-1', user);

    expect(getCachedUser('user-1')).toBe(user);
  });

  it('expires the entry after the 60s TTL', () => {
    vi.useFakeTimers();
    const user = fakeUser('user-1');
    setCachedUser('user-1', user);

    vi.advanceTimersByTime(59_000);
    expect(getCachedUser('user-1')).toBe(user);

    vi.advanceTimersByTime(2_000);
    expect(getCachedUser('user-1')).toBeNull();
  });

  it('drops the entry on invalidation', () => {
    const user = fakeUser('user-1');
    setCachedUser('user-1', user);

    invalidateAuthCache('user-1');

    expect(getCachedUser('user-1')).toBeNull();
  });

  it('keys per user — invalidating one does not touch the other', () => {
    setCachedUser('user-1', fakeUser('user-1'));
    setCachedUser('user-2', fakeUser('user-2'));

    invalidateAuthCache('user-1');

    expect(getCachedUser('user-1')).toBeNull();
    expect(getCachedUser('user-2')).not.toBeNull();
  });
});
