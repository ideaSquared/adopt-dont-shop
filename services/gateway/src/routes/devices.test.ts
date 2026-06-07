import { Metadata, status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NotificationsV1,
  type ListDeviceTokensRequest,
  type RegisterDeviceTokenRequest,
  type UnregisterDeviceTokenRequest,
} from '@adopt-dont-shop/proto';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';

import { registerDevicesRoutes } from './devices.js';

const TOKEN_FIXTURE = {
  tokenId: 'dt-1',
  userId: 'usr-1',
  deviceToken: 'fcm-abcdef',
  platform: NotificationsV1.DevicePlatform.DEVICE_PLATFORM_ANDROID,
  status: NotificationsV1.DeviceTokenStatus.DEVICE_TOKEN_STATUS_ACTIVE,
  deviceInfoJson: '{}',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

function makeClient(): NotificationsClient & {
  registerDeviceTokenMock: ReturnType<typeof vi.fn>;
  unregisterDeviceTokenMock: ReturnType<typeof vi.fn>;
  listDeviceTokensMock: ReturnType<typeof vi.fn>;
} {
  const registerDeviceTokenMock = vi.fn();
  const unregisterDeviceTokenMock = vi.fn();
  const listDeviceTokensMock = vi.fn();
  return {
    // Other methods are unused by these routes but the type requires them.
    create: vi.fn(),
    list: vi.fn(),
    dismiss: vi.fn(),
    close: vi.fn(),
    registerDeviceToken: registerDeviceTokenMock,
    unregisterDeviceToken: unregisterDeviceTokenMock,
    listDeviceTokens: listDeviceTokensMock,
    registerDeviceTokenMock,
    unregisterDeviceTokenMock,
    listDeviceTokensMock,
  };
}

async function buildApp(client: NotificationsClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerDevicesRoutes(app, { client });
  return app;
}

describe('POST /api/v1/devices — register', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 201 on a fresh registration and forwards principal headers', async () => {
    client.registerDeviceTokenMock.mockResolvedValueOnce({
      token: TOKEN_FIXTURE,
      alreadyRegistered: false,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
      },
      payload: {
        token: 'fcm-abcdef',
        platform: 'android',
        deviceInfo: { os: 'android 14' },
      },
    });

    expect(res.statusCode).toBe(201);
    const [req, metadata] = client.registerDeviceTokenMock.mock.calls[0] as [
      RegisterDeviceTokenRequest,
      Metadata,
    ];
    expect(req.deviceToken).toBe('fcm-abcdef');
    expect(req.platform).toBe(NotificationsV1.DevicePlatform.DEVICE_PLATFORM_ANDROID);
    expect(req.deviceInfoJson).toBe('{"os":"android 14"}');
    expect(metadata.get('x-user-id')).toEqual(['usr-1']);
  });

  it('returns 200 when the token already existed (refresh path)', async () => {
    client.registerDeviceTokenMock.mockResolvedValueOnce({
      token: TOKEN_FIXTURE,
      alreadyRegistered: true,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { token: 'fcm-abcdef', platform: 'android' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('accepts proto-shape body fields (deviceToken, app_version, device_info)', async () => {
    client.registerDeviceTokenMock.mockResolvedValueOnce({
      token: TOKEN_FIXTURE,
      alreadyRegistered: false,
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: {
        deviceToken: 'apns-xyz',
        platform: 'ios',
        app_version: '2.0.1',
        device_info: { os: 'ios 17' },
      },
    });
    const [req] = client.registerDeviceTokenMock.mock.calls[0] as [
      RegisterDeviceTokenRequest,
      Metadata,
    ];
    expect(req.deviceToken).toBe('apns-xyz');
    expect(req.appVersion).toBe('2.0.1');
    expect(req.deviceInfoJson).toBe('{"os":"ios 17"}');
  });

  it('maps gRPC PERMISSION_DENIED to HTTP 403', async () => {
    client.registerDeviceTokenMock.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: 'forbidden',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { token: 'fcm-abcdef', platform: 'android' },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: 'forbidden' });
  });
});

describe('GET /api/v1/devices — list', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists active tokens by default', async () => {
    client.listDeviceTokensMock.mockResolvedValueOnce({ tokens: [TOKEN_FIXTURE] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(200);
    const [req] = client.listDeviceTokensMock.mock.calls[0] as [ListDeviceTokensRequest, Metadata];
    expect(req.includeInactive).toBe(false);
  });

  it('honours ?includeInactive=true and ?include_inactive=true', async () => {
    client.listDeviceTokensMock.mockResolvedValueOnce({ tokens: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/devices?includeInactive=true',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [req] = client.listDeviceTokensMock.mock.calls[0] as [ListDeviceTokensRequest, Metadata];
    expect(req.includeInactive).toBe(true);

    client.listDeviceTokensMock.mockResolvedValueOnce({ tokens: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/devices?include_inactive=true',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    const [req2] = client.listDeviceTokensMock.mock.calls[1] as [ListDeviceTokensRequest, Metadata];
    expect(req2.includeInactive).toBe(true);
  });
});

describe('DELETE /api/v1/devices/:tokenId — unregister', () => {
  let app: FastifyInstance;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    app = await buildApp(client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('forwards tokenId to the gRPC request', async () => {
    client.unregisterDeviceTokenMock.mockResolvedValueOnce({ token: TOKEN_FIXTURE });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/devices/dt-1',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(200);
    const [req] = client.unregisterDeviceTokenMock.mock.calls[0] as [
      UnregisterDeviceTokenRequest,
      Metadata,
    ];
    expect(req.tokenId).toBe('dt-1');
  });

  it('maps NOT_FOUND to HTTP 404', async () => {
    client.unregisterDeviceTokenMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'not found',
    });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/devices/dt-missing',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });
    expect(res.statusCode).toBe(404);
  });
});
