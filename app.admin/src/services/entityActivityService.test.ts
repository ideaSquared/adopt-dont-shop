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

  it('hits the pets route for entityType=pet', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleActivity });

    const result = await entityActivityService.getActivity('pet', 'pet-1', { limit: 25 });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/pets/pet-1/activity', { limit: 25 });
    expect(result).toEqual(sampleActivity);
  });

  it('hits the application route for entityType=application', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleActivity });

    const result = await entityActivityService.getActivity('application', 'app-1', { limit: 25 });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/applications/app-1/activity', { limit: 25 });
    expect(result).toEqual(sampleActivity);
  });

  it('hits the rescue route for entityType=rescue', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleActivity });

    const result = await entityActivityService.getActivity('rescue', 'r1', { limit: 10 });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/rescues/r1/activity', { limit: 10 });
    expect(result).toEqual(sampleActivity);
  });

  it('hits the chat route for entityType=chat', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleActivity });

    const result = await entityActivityService.getActivity('chat', 'chat-1', { limit: 5 });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/chats/chat-1/activity', { limit: 5 });
    expect(result).toEqual(sampleActivity);
  });

  it('unwraps the {success, data} envelope', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: sampleActivity });
    const result = await entityActivityService.getActivity('user', 'u1');
    expect(result).toBe(sampleActivity);
  });

  it('throws EntityActivityNotSupportedError for entity types not yet wired', async () => {
    await expect(entityActivityService.getActivity('report', 'r1')).rejects.toBeInstanceOf(
      EntityActivityNotSupportedError
    );
    expect(mockGet).not.toHaveBeenCalled();
  });
});
