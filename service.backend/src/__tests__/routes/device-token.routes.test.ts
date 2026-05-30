/**
 * ADS-611 — behaviour coverage for device-token routes.
 *
 * The routes handle FCM/APNs token registration for push notifications.
 * Each endpoint must:
 *   - require an authenticated user (authenticateToken is mounted as
 *     parent middleware);
 *   - validate platform / token / tokenId per express-validator rules;
 *   - scope everything to req.user.userId (so user A can never delete
 *     user B's device token).
 */

import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../../types/auth';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn(), logBusiness: vi.fn() },
}));

const markAsUsed = vi.fn();
const save = vi.fn().mockResolvedValue(undefined);
const destroy = vi.fn().mockResolvedValue(undefined);

vi.mock('../../models/DeviceToken', () => {
  return {
    default: {
      findOrCreate: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
    },
    DevicePlatform: { IOS: 'ios', ANDROID: 'android', WEB: 'web' },
    TokenStatus: { ACTIVE: 'active', INACTIVE: 'inactive' },
  };
});

const authenticateTokenMock = vi.fn();
vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    authenticateTokenMock(req, res, next),
}));

import DeviceToken from '../../models/DeviceToken';
import deviceTokenRouter from '../../routes/device-token.routes';

const mockedDeviceToken = DeviceToken as unknown as {
  findOrCreate: ReturnType<typeof vi.fn>;
  findAll: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/device-tokens', deviceTokenRouter);
  return app;
};

const authenticateAs = (userId: string): void => {
  authenticateTokenMock.mockImplementation(
    (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      req.user = {
        userId,
        userType: 'adopter',
      } as AuthenticatedRequest['user'];
      next();
    }
  );
};

const makeDeviceTokenRow = (overrides: Record<string, unknown> = {}) => ({
  token_id: 'token-uuid-1',
  user_id: 'user-1',
  device_token: 'fcm-token-abcdef0123',
  platform: 'ios',
  app_version: '1.0.0',
  status: 'active',
  last_used_at: new Date('2026-01-01').toISOString(),
  expires_at: null,
  created_at: new Date('2026-01-01').toISOString(),
  markAsUsed,
  save,
  destroy,
  ...overrides,
});

describe('POST /api/v1/device-tokens (ADS-611)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a new device token scoped to the authenticated user', async () => {
    authenticateAs('user-1');
    const row = makeDeviceTokenRow();
    mockedDeviceToken.findOrCreate.mockResolvedValue([row, true]);

    const res = await request(buildApp()).post('/api/v1/device-tokens').send({
      token: 'fcm-token-abcdef0123',
      platform: 'ios',
      appVersion: '1.0.0',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { tokenId: 'token-uuid-1' } });
    expect(mockedDeviceToken.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 'user-1', device_token: 'fcm-token-abcdef0123' },
      })
    );
    expect(markAsUsed).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });

  it('rejects an invalid platform', async () => {
    authenticateAs('user-1');
    const res = await request(buildApp())
      .post('/api/v1/device-tokens')
      .send({ token: 'fcm-token-abcdef0123', platform: 'symbian' });

    expect(res.status).toBe(422);
    expect(mockedDeviceToken.findOrCreate).not.toHaveBeenCalled();
  });

  it('rejects a token that is too short', async () => {
    authenticateAs('user-1');
    const res = await request(buildApp())
      .post('/api/v1/device-tokens')
      .send({ token: 'short', platform: 'ios' });

    expect(res.status).toBe(422);
    expect(mockedDeviceToken.findOrCreate).not.toHaveBeenCalled();
  });

  it('preserves fingerprint metadata when re-registering an existing token', async () => {
    // Defense-in-depth: if device fingerprinting / trust scoring is ever
    // added, an attacker must not be able to overwrite the stored
    // platform / appVersion / deviceInfo on an existing row by simply
    // re-POSTing the same token with crafted values.
    authenticateAs('user-1');
    const existing = makeDeviceTokenRow({
      platform: 'ios',
      app_version: '1.0.0',
      device_info: { model: 'iPhone' },
    });
    mockedDeviceToken.findOrCreate.mockResolvedValue([existing, false]);

    const res = await request(buildApp())
      .post('/api/v1/device-tokens')
      .send({
        token: 'fcm-token-abcdef0123',
        platform: 'android',
        appVersion: '9.9.9',
        deviceInfo: { model: 'attacker-device' },
      });

    expect(res.status).toBe(201);
    expect(markAsUsed).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
    // Metadata on the existing row must remain untouched.
    expect(existing.platform).toBe('ios');
    expect(existing.app_version).toBe('1.0.0');
    expect(existing.device_info).toEqual({ model: 'iPhone' });
  });

  it('persists all metadata when a brand-new token is registered', async () => {
    authenticateAs('user-1');
    const created = makeDeviceTokenRow({
      platform: 'android',
      app_version: '2.0.0',
      device_info: { model: 'Pixel' },
    });
    mockedDeviceToken.findOrCreate.mockResolvedValue([created, true]);

    const res = await request(buildApp())
      .post('/api/v1/device-tokens')
      .send({
        token: 'fcm-token-newdevice0123',
        platform: 'android',
        appVersion: '2.0.0',
        deviceInfo: { model: 'Pixel' },
      });

    expect(res.status).toBe(201);
    // defaults: are what created the row, so the row already carries
    // the submitted metadata — assert the findOrCreate call captured it.
    expect(mockedDeviceToken.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        defaults: expect.objectContaining({
          platform: 'android',
          app_version: '2.0.0',
          device_info: { model: 'Pixel' },
        }),
      })
    );
  });

  it('keeps two different tokens for the same user independent', async () => {
    authenticateAs('user-1');
    const rowA = makeDeviceTokenRow({ token_id: 'tok-a', device_token: 'token-a-0123456789' });
    mockedDeviceToken.findOrCreate.mockResolvedValueOnce([rowA, true]);

    const resA = await request(buildApp()).post('/api/v1/device-tokens').send({
      token: 'token-a-0123456789',
      platform: 'ios',
    });
    expect(resA.status).toBe(201);
    expect(resA.body.data.tokenId).toBe('tok-a');

    const rowB = makeDeviceTokenRow({ token_id: 'tok-b', device_token: 'token-b-0123456789' });
    mockedDeviceToken.findOrCreate.mockResolvedValueOnce([rowB, true]);

    const resB = await request(buildApp()).post('/api/v1/device-tokens').send({
      token: 'token-b-0123456789',
      platform: 'android',
    });
    expect(resB.status).toBe(201);
    expect(resB.body.data.tokenId).toBe('tok-b');

    // Each registration is scoped by both user_id AND device_token.
    expect(mockedDeviceToken.findOrCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { user_id: 'user-1', device_token: 'token-a-0123456789' },
      })
    );
    expect(mockedDeviceToken.findOrCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { user_id: 'user-1', device_token: 'token-b-0123456789' },
      })
    );
  });
});

describe('GET /api/v1/device-tokens (ADS-611)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists tokens scoped to the authenticated user', async () => {
    authenticateAs('user-1');
    mockedDeviceToken.findAll.mockResolvedValue([
      makeDeviceTokenRow({ token_id: 'tok-1', platform: 'ios' }),
      makeDeviceTokenRow({ token_id: 'tok-2', platform: 'android' }),
    ]);

    const res = await request(buildApp()).get('/api/v1/device-tokens');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(mockedDeviceToken.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 'user-1' } })
    );
  });
});

describe('DELETE /api/v1/device-tokens/:tokenId (ADS-611)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a non-UUID tokenId', async () => {
    authenticateAs('user-1');
    const res = await request(buildApp()).delete('/api/v1/device-tokens/not-a-uuid');
    expect(res.status).toBe(422);
    expect(mockedDeviceToken.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 when the token does not belong to the user', async () => {
    authenticateAs('user-1');
    mockedDeviceToken.findOne.mockResolvedValue(null);

    const res = await request(buildApp()).delete(
      '/api/v1/device-tokens/123e4567-e89b-12d3-a456-426614174000'
    );

    expect(res.status).toBe(404);
    // Scoping check — findOne must include the userId predicate so user A
    // cannot delete user B's tokens.
    expect(mockedDeviceToken.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ user_id: 'user-1' }),
      })
    );
  });

  it('deletes the device when it belongs to the user', async () => {
    authenticateAs('user-1');
    const row = makeDeviceTokenRow();
    mockedDeviceToken.findOne.mockResolvedValue(row);

    const res = await request(buildApp()).delete(
      '/api/v1/device-tokens/123e4567-e89b-12d3-a456-426614174000'
    );

    expect(res.status).toBe(204);
    expect(destroy).toHaveBeenCalled();
  });
});
