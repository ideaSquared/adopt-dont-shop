import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { entityActivityService, EntityActivityNotSupportedError } from './entityActivityService';

const sampleActivity = [
  {
    activityId: 1,
    activityType: 'login' as const,
    action: 'USER_LOGIN',
    description: 'Logged into account',
    category: 'AUTH',
    ipAddress: null,
    userAgent: null,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

describe('entityActivityService.getActivity', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('hits the user route for entityType=user', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleActivity });

    const result = await entityActivityService.getActivity('user', 'u1', { limit: 10 });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/users/u1/activity', { limit: 10 });
    expect(result).toEqual(sampleActivity);
  });

  it('hits the admin support route for entityType=support_ticket', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleActivity });

    const result = await entityActivityService.getActivity('support_ticket', 't1', { limit: 5 });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/support/tickets/t1/activity', {
      limit: 5,
    });
    expect(result).toEqual(sampleActivity);
  });

  it('unwraps the {success, data} envelope', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleActivity });
    const result = await entityActivityService.getActivity('user', 'u1');
    expect(result).toBe(sampleActivity);
  });

  it('throws EntityActivityNotSupportedError for entity types not yet wired', async () => {
    await expect(entityActivityService.getActivity('rescue', 'r1')).rejects.toBeInstanceOf(
      EntityActivityNotSupportedError
    );
    expect(mockGet).not.toHaveBeenCalled();
  });
});
