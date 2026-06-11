import { beforeEach, describe, expect, it } from 'vitest';
import { createMockUser, resetMockUserCounter } from './index';

describe('createMockUser', () => {
  beforeEach(() => {
    resetMockUserCounter();
  });

  it('returns an active adopter with sensible defaults', () => {
    const user = createMockUser();
    expect(user).toMatchObject({
      userType: 'adopter',
      status: 'active',
      emailVerified: true,
    });
    expect(user.userId).toMatch(/^user-\d{4}$/);
    expect(user.email).toMatch(/^test-\d{4}@example\.com$/);
  });

  it('produces distinct ids on successive calls', () => {
    const a = createMockUser();
    const b = createMockUser();
    expect(a.userId).not.toBe(b.userId);
    expect(a.email).not.toBe(b.email);
  });

  it('respects overrides', () => {
    const admin = createMockUser({ userType: 'admin', status: 'suspended' });
    expect(admin.userType).toBe('admin');
    expect(admin.status).toBe('suspended');
  });

  it('resets the sequence when resetMockUserCounter is called', () => {
    const first = createMockUser();
    resetMockUserCounter();
    const second = createMockUser();
    expect(second.userId).toBe(first.userId);
  });
});
