import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockFetchWithAuth = vi.fn();

vi.mock('./libraryServices', () => ({
  apiService: {
    get: (...args: unknown[]) => mockGet(...args),
    fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
  },
}));

import { sendBroadcast, previewBroadcastAudience } from './broadcastService';

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

const input = {
  audience: 'all-rescues' as const,
  title: 'Maintenance',
  body: 'Down at midnight',
  channels: ['in_app' as const, 'email' as const],
  idempotencyKey: 'key-123',
};

describe('sendBroadcast', () => {
  it('posts the broadcast with the idempotency header and returns the result', async () => {
    const result = {
      audience: 'all-rescues',
      targetCount: 10,
      deliveredInApp: 8,
      skippedByPrefs: 1,
      skippedByDnd: 1,
      channels: ['in_app', 'email'],
    };
    mockFetchWithAuth.mockResolvedValueOnce({ success: true, data: result });

    const response = await sendBroadcast(input);

    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/v1/notifications/broadcast', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'key-123' },
      body: {
        audience: 'all-rescues',
        title: 'Maintenance',
        body: 'Down at midnight',
        channels: ['in_app', 'email'],
      },
    });
    expect(response).toEqual(result);
  });

  it('throws the server message when the response is unsuccessful', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({ success: false, message: 'rate limited' });

    await expect(sendBroadcast(input)).rejects.toThrow('rate limited');
  });

  it('throws a default message when the response is empty', async () => {
    mockFetchWithAuth.mockResolvedValueOnce(null);

    await expect(sendBroadcast(input)).rejects.toThrow('Failed to send broadcast');
  });
});

describe('previewBroadcastAudience', () => {
  it('returns the audience count', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: { audience: 'all', count: 42 } });

    const count = await previewBroadcastAudience('all');

    expect(mockGet).toHaveBeenCalledWith('/api/v1/notifications/broadcast/preview', {
      audience: 'all',
    });
    expect(count).toBe(42);
  });

  it('throws when the preview is unsuccessful', async () => {
    mockGet.mockResolvedValueOnce({ success: false });

    await expect(previewBroadcastAudience('all')).rejects.toThrow('Failed to preview audience');
  });
});
