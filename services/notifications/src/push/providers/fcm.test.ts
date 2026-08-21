import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PushSendRequest } from '../types.js';

// Mock firebase-admin so send() is exercised without any network I/O.
const { certMock, getAppsMock, initializeAppMock, sendMock, getMessagingMock } = vi.hoisted(() => {
  const sendMock = vi.fn();
  return {
    certMock: vi.fn((serviceAccount: unknown) => ({ serviceAccount })),
    getAppsMock: vi.fn(() => [] as unknown[]),
    initializeAppMock: vi.fn(() => ({ name: '[DEFAULT]' })),
    sendMock,
    getMessagingMock: vi.fn(() => ({ send: sendMock })),
  };
});
vi.mock('firebase-admin/app', () => ({
  cert: certMock,
  getApps: getAppsMock,
  initializeApp: initializeAppMock,
}));
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: getMessagingMock,
}));

import { createFcmPushProvider, type FcmConfig } from './fcm.js';

const quietLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
} as unknown as Parameters<typeof createFcmPushProvider>[0]['logger'];

const config: FcmConfig = {
  serviceAccountJson: JSON.stringify({
    project_id: 'proj-1',
    client_email: 'svc@proj-1.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
  }),
  projectId: 'proj-1',
};

const request: PushSendRequest = {
  token: 'device-token-1234567890',
  platform: 'ios',
  title: 'A new match',
  body: 'Buddy is looking for a home',
};

describe('fcm push provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAppsMock.mockReturnValue([]);
    getMessagingMock.mockReturnValue({ send: sendMock });
  });

  it('sends via FCM and returns the provider message id on success', async () => {
    sendMock.mockResolvedValueOnce('projects/proj-1/messages/abc123');
    const provider = createFcmPushProvider({ config, logger: quietLogger });

    const result = await provider.send(request);

    expect(result).toEqual({ success: true, messageId: 'projects/proj-1/messages/abc123' });
    expect(sendMock).toHaveBeenCalledWith({
      token: request.token,
      notification: { title: request.title, body: request.body },
      data: undefined,
    });
  });

  it.each([
    ['messaging/registration-token-not-registered'],
    ['messaging/invalid-registration-token'],
  ])('reports tokenInvalid:true when FCM rejects with %s', async code => {
    sendMock.mockRejectedValueOnce({ code, message: `FCM error: ${code}` });
    const provider = createFcmPushProvider({ config, logger: quietLogger });

    const result = await provider.send(request);

    expect(result).toEqual({ success: false, error: `FCM error: ${code}`, tokenInvalid: true });
  });

  it('returns a plain failure (no tokenInvalid) for other FCM errors', async () => {
    sendMock.mockRejectedValueOnce({
      code: 'messaging/internal-error',
      message: 'FCM is temporarily unavailable',
    });
    const provider = createFcmPushProvider({ config, logger: quietLogger });

    const result = await provider.send(request);

    expect(result).toEqual({ success: false, error: 'FCM is temporarily unavailable' });
    expect(result.tokenInvalid).toBeUndefined();
  });

  it('reuses the same firebase app across sends instead of re-initialising it', async () => {
    sendMock.mockResolvedValue('m1');
    const provider = createFcmPushProvider({ config, logger: quietLogger });

    await provider.send(request);
    await provider.send({ ...request, token: 'device-token-9999999999' });

    expect(initializeAppMock).toHaveBeenCalledTimes(1);
  });

  it('validateConfiguration checks the service-account JSON actually parses', () => {
    const validProvider = createFcmPushProvider({ config, logger: quietLogger });
    expect(validProvider.validateConfiguration()).toBe(true);

    const invalidProvider = createFcmPushProvider({
      config: { ...config, serviceAccountJson: '{"not":"a service account"}' },
      logger: quietLogger,
    });
    expect(invalidProvider.validateConfiguration()).toBe(false);
  });
});
