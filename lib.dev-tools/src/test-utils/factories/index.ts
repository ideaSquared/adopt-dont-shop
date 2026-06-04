/**
 * Shared frontend test-data factories (ADS-718).
 *
 * Pure data factories — no DB, no MSW. Each factory returns a plain object
 * matching a public type shape and accepts an `overrides` object to tweak
 * specific fields per test.
 *
 * Why a factory and not a global mock object: tests need to vary a single
 * field at a time without copy-pasting the full shape. Per-app
 * setup-tests.ts files (~220 lines each) duplicate this kind of helper —
 * this module is the agreed home so additions land in one place.
 *
 * This is the scaffold tranche of ADS-718. Only `createMockUser` is
 * included to anchor the pattern; remaining factories (Pet, Rescue,
 * Application, ApiResponse) will follow as consumer setup-tests files
 * migrate off their inline mock objects.
 */

export type MockUser = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'adopter' | 'rescue_staff' | 'admin' | 'moderator' | 'super_admin' | 'support_agent';
  status: 'active' | 'inactive' | 'suspended';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

let counter = 0;

/**
 * Returns a deterministic-but-unique mock user. Each call increments an
 * internal counter so two calls in the same test produce distinct userIds
 * and emails. Override any field via the partial argument.
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  counter += 1;
  const id = String(counter).padStart(4, '0');
  return {
    userId: `user-${id}`,
    email: `test-${id}@example.com`,
    firstName: 'Test',
    lastName: `User${id}`,
    userType: 'adopter',
    status: 'active',
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Resets the internal sequence counter. Call from a beforeEach() when a
 * test relies on stable userIds across runs (rare — most tests should
 * accept whatever id the factory produces and assert by shape).
 */
export function resetMockUserCounter(): void {
  counter = 0;
}
