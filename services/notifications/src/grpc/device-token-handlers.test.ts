import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import {
  NotificationsV1,
  type RegisterDeviceTokenRequest,
  type UnregisterDeviceTokenRequest,
} from '@adopt-dont-shop/proto';

import {
  listDeviceTokensHandler,
  registerDeviceTokenHandler,
  unregisterDeviceTokenHandler,
} from './device-token-handlers.js';

// --- Fixtures + mocks ------------------------------------------------

const ADOPTER_PRINCIPAL: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: [
    'notifications.device-tokens.read' as Permission,
    'notifications.device-tokens.write' as Permission,
  ],
};

const ADMIN_PRINCIPAL: Principal = {
  userId: 'usr-admin' as UserId,
  roles: ['admin'],
  permissions: [
    'notifications.device-tokens.read' as Permission,
    'notifications.device-tokens.read:any' as Permission,
    'notifications.device-tokens.write' as Permission,
    'notifications.device-tokens.write:any' as Permission,
  ],
};

const UNPRIVILEGED_PRINCIPAL: Principal = {
  userId: 'usr-anyone' as UserId,
  roles: ['adopter'],
  permissions: [],
};

const tokenRowFixture = (overrides: Record<string, unknown> = {}) => ({
  token_id: 'dt-1',
  user_id: 'usr-adopter',
  device_token: 'fcm-token-abcdef',
  platform: 'android' as const,
  app_version: '1.0.0',
  device_info: {},
  status: 'active' as const,
  last_used_at: new Date('2026-06-01T00:00:00Z'),
  expires_at: null,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  deleted_at: null,
  ...overrides,
});

const makeMocks = () => {
  const poolScript: Array<{ rows: unknown[] }> = [];
  const pool = {
    query: vi.fn(async () => {
      const next = poolScript.shift();
      return next ?? { rows: [] };
    }),
    connect: vi.fn(),
  };
  return {
    pool: pool as unknown as Pool,
    poolMock: pool,
    poolScript,
    deps: {
      pool: pool as unknown as Pool,
      nats: {} as unknown as NatsConnection,
    },
  };
};

const BASE_REGISTER: RegisterDeviceTokenRequest = {
  userId: '',
  deviceToken: 'fcm-token-abcdef',
  platform: NotificationsV1.DevicePlatform.DEVICE_PLATFORM_ANDROID,
  appVersion: '1.0.0',
  deviceInfoJson: '',
} as unknown as RegisterDeviceTokenRequest;

// --- RegisterDeviceToken --------------------------------------------

describe('registerDeviceTokenHandler', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects when device_token is missing', async () => {
    await expect(
      registerDeviceTokenHandler(mocks.deps, ADOPTER_PRINCIPAL, {
        ...BASE_REGISTER,
        deviceToken: '',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when platform is UNSPECIFIED', async () => {
    await expect(
      registerDeviceTokenHandler(mocks.deps, ADOPTER_PRINCIPAL, {
        ...BASE_REGISTER,
        platform: NotificationsV1.DevicePlatform.DEVICE_PLATFORM_UNSPECIFIED,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when the principal lacks notifications.device-tokens.write', async () => {
    await expect(
      registerDeviceTokenHandler(mocks.deps, UNPRIVILEGED_PRINCIPAL, BASE_REGISTER)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects non-object device_info_json', async () => {
    await expect(
      registerDeviceTokenHandler(mocks.deps, ADOPTER_PRINCIPAL, {
        ...BASE_REGISTER,
        deviceInfoJson: '"not an object"',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects cross-user registration without :any permission', async () => {
    await expect(
      registerDeviceTokenHandler(mocks.deps, ADOPTER_PRINCIPAL, {
        ...BASE_REGISTER,
        userId: 'usr-someone-else',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('inserts a new row and returns alreadyRegistered=false', async () => {
    // registerDeviceToken: SELECT (empty) → INSERT.
    mocks.poolScript.push({ rows: [] });
    mocks.poolScript.push({ rows: [tokenRowFixture()] });

    const res = await registerDeviceTokenHandler(mocks.deps, ADOPTER_PRINCIPAL, BASE_REGISTER);

    expect(res.alreadyRegistered).toBe(false);
    expect(res.token?.userId).toBe('usr-adopter');
    expect(res.token?.platform).toBe(NotificationsV1.DevicePlatform.DEVICE_PLATFORM_ANDROID);
    expect(res.token?.status).toBe(NotificationsV1.DeviceTokenStatus.DEVICE_TOKEN_STATUS_ACTIVE);
  });

  it('refreshes an existing row and returns alreadyRegistered=true', async () => {
    // SELECT returns existing row → UPDATE refreshed row.
    mocks.poolScript.push({ rows: [tokenRowFixture()] });
    mocks.poolScript.push({
      rows: [tokenRowFixture({ last_used_at: new Date('2026-06-06T00:00:00Z') })],
    });

    const res = await registerDeviceTokenHandler(mocks.deps, ADOPTER_PRINCIPAL, BASE_REGISTER);

    expect(res.alreadyRegistered).toBe(true);
  });

  it('admin with :any can register on behalf of another user', async () => {
    mocks.poolScript.push({ rows: [] });
    mocks.poolScript.push({
      rows: [tokenRowFixture({ user_id: 'usr-target' })],
    });

    const res = await registerDeviceTokenHandler(mocks.deps, ADMIN_PRINCIPAL, {
      ...BASE_REGISTER,
      userId: 'usr-target',
    });

    expect(res.token?.userId).toBe('usr-target');
  });
});

// --- UnregisterDeviceToken ------------------------------------------

describe('unregisterDeviceTokenHandler', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  const baseReq: UnregisterDeviceTokenRequest = { tokenId: 'dt-1' };

  it('rejects when token_id is missing', async () => {
    await expect(
      unregisterDeviceTokenHandler(mocks.deps, ADOPTER_PRINCIPAL, { tokenId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when principal lacks write permission', async () => {
    await expect(
      unregisterDeviceTokenHandler(mocks.deps, UNPRIVILEGED_PRINCIPAL, baseReq)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns NOT_FOUND when token does not exist', async () => {
    mocks.poolScript.push({ rows: [] });
    await expect(
      unregisterDeviceTokenHandler(mocks.deps, ADOPTER_PRINCIPAL, baseReq)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects unregistering another user’s token without :any', async () => {
    mocks.poolScript.push({ rows: [tokenRowFixture({ user_id: 'usr-other' })] });
    await expect(
      unregisterDeviceTokenHandler(mocks.deps, ADOPTER_PRINCIPAL, baseReq)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('soft-deletes the row and returns it', async () => {
    // getDeviceTokenById SELECT → unregisterDeviceToken UPDATE.
    mocks.poolScript.push({ rows: [tokenRowFixture()] });
    mocks.poolScript.push({
      rows: [tokenRowFixture({ status: 'inactive', deleted_at: new Date() })],
    });

    const res = await unregisterDeviceTokenHandler(mocks.deps, ADOPTER_PRINCIPAL, baseReq);

    expect(res.token?.status).toBe(NotificationsV1.DeviceTokenStatus.DEVICE_TOKEN_STATUS_INACTIVE);
  });
});

// --- ListDeviceTokens -----------------------------------------------

describe('listDeviceTokensHandler', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects unprivileged principals', async () => {
    await expect(
      listDeviceTokensHandler(mocks.deps, UNPRIVILEGED_PRINCIPAL, {
        userId: '',
        includeInactive: false,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('returns the calling user’s tokens (self-scoped)', async () => {
    mocks.poolScript.push({
      rows: [tokenRowFixture(), tokenRowFixture({ token_id: 'dt-2' })],
    });

    const res = await listDeviceTokensHandler(mocks.deps, ADOPTER_PRINCIPAL, {
      userId: '',
      includeInactive: false,
    });

    expect(res.tokens).toHaveLength(2);
    expect(res.tokens?.[0].tokenId).toBe('dt-1');
    expect(res.tokens?.[1].tokenId).toBe('dt-2');
  });

  it('rejects cross-user list without :any', async () => {
    await expect(
      listDeviceTokensHandler(mocks.deps, ADOPTER_PRINCIPAL, {
        userId: 'usr-other',
        includeInactive: false,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});
