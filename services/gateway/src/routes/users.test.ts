import { Metadata, status } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthV1,
  NotificationsV1,
  type UpdateAccountRequest,
  type UpdateNotificationPreferencesRequest,
  type UpdatePrivacyPreferencesRequest,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { NotificationsClient } from '../grpc-clients/notifications-client.js';

import { registerUsersRoutes } from './users.js';

// --- Fixtures -------------------------------------------------------

const NOTIF_PREFS_FIXTURE: NotificationsV1.NotificationPreferences = {
  userId: 'usr-1',
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  digestFrequency: NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_WEEKLY,
  applicationUpdates: true,
  petMatches: true,
  rescueUpdates: true,
  chatMessages: true,
  timezone: 'UTC',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const PRIVACY_PREFS_FIXTURE: AuthV1.PrivacyPreferences = {
  userId: 'usr-1',
  profileVisibility: AuthV1.ProfileVisibility.PROFILE_VISIBILITY_RESCUES_ONLY,
  showLastSeen: false,
  showLocation: true,
  allowSearchIndexing: false,
  allowDataExport: true,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const ME_FIXTURE: AuthV1.GetMeResponse = {
  user: {
    userId: 'usr-1',
    email: 'user@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: AuthV1.UserRole.USER_ROLE_ADOPTER,
    status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
    emailVerified: true,
    twoFactorEnabled: false,
    permissions: [],
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  } as unknown as AuthV1.User,
};

// --- Mocks ----------------------------------------------------------

function makeAuthClient(): AuthClient & {
  getMeMock: ReturnType<typeof vi.fn>;
  updateAccountMock: ReturnType<typeof vi.fn>;
  getPrivacyPreferencesMock: ReturnType<typeof vi.fn>;
  updatePrivacyPreferencesMock: ReturnType<typeof vi.fn>;
  resetPrivacyPreferencesMock: ReturnType<typeof vi.fn>;
} {
  const getMeMock = vi.fn();
  const updateAccountMock = vi.fn();
  const getPrivacyPreferencesMock = vi.fn();
  const updatePrivacyPreferencesMock = vi.fn();
  const resetPrivacyPreferencesMock = vi.fn();
  return {
    // We only use these four — the rest are stubs satisfying the type.
    getMe: getMeMock,
    updateAccount: updateAccountMock,
    getPrivacyPreferences: getPrivacyPreferencesMock,
    updatePrivacyPreferences: updatePrivacyPreferencesMock,
    resetPrivacyPreferences: resetPrivacyPreferencesMock,
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    validateToken: vi.fn(),
    assignRole: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    close: vi.fn(),
    getMeMock,
    updateAccountMock,
    getPrivacyPreferencesMock,
    updatePrivacyPreferencesMock,
    resetPrivacyPreferencesMock,
  };
}

function makeNotifClient(): NotificationsClient & {
  getNotificationPreferencesMock: ReturnType<typeof vi.fn>;
  updateNotificationPreferencesMock: ReturnType<typeof vi.fn>;
  resetNotificationPreferencesMock: ReturnType<typeof vi.fn>;
} {
  const getNotificationPreferencesMock = vi.fn();
  const updateNotificationPreferencesMock = vi.fn();
  const resetNotificationPreferencesMock = vi.fn();
  return {
    getNotificationPreferences: getNotificationPreferencesMock,
    updateNotificationPreferences: updateNotificationPreferencesMock,
    resetNotificationPreferences: resetNotificationPreferencesMock,
    create: vi.fn(),
    list: vi.fn(),
    dismiss: vi.fn(),
    getNotification: vi.fn(),
    getUnreadCount: vi.fn(),
    markAllRead: vi.fn(),
    deleteNotification: vi.fn(),
    registerDeviceToken: vi.fn(),
    unregisterDeviceToken: vi.fn(),
    listDeviceTokens: vi.fn(),
    close: vi.fn(),
    getNotificationPreferencesMock,
    updateNotificationPreferencesMock,
    resetNotificationPreferencesMock,
  };
}

async function buildApp(auth: AuthClient, notif: NotificationsClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerUsersRoutes(app, { authClient: auth, notificationsClient: notif });
  return app;
}

// --- GET /api/v1/users/profile --------------------------------------

describe('GET /api/v1/users/profile', () => {
  let app: FastifyInstance;
  let auth: ReturnType<typeof makeAuthClient>;
  let notif: ReturnType<typeof makeNotifClient>;

  beforeEach(async () => {
    auth = makeAuthClient();
    notif = makeNotifClient();
    app = await buildApp(auth, notif);
  });
  afterEach(async () => {
    await app.close();
  });

  it('routes to authClient.getMe and forwards metadata', async () => {
    auth.getMeMock.mockResolvedValueOnce(ME_FIXTURE);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/profile',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(auth.getMeMock).toHaveBeenCalledTimes(1);
    const [, metadata] = auth.getMeMock.mock.calls[0] as [unknown, Metadata];
    expect(metadata.get('x-user-id')).toEqual(['usr-1']);
  });
});

// --- PUT /api/v1/users/profile --------------------------------------

describe('PUT /api/v1/users/profile', () => {
  let app: FastifyInstance;
  let auth: ReturnType<typeof makeAuthClient>;
  let notif: ReturnType<typeof makeNotifClient>;

  beforeEach(async () => {
    auth = makeAuthClient();
    notif = makeNotifClient();
    app = await buildApp(auth, notif);
  });
  afterEach(async () => {
    await app.close();
  });

  it('maps camelCase + snake_case body keys to UpdateAccount', async () => {
    auth.updateAccountMock.mockResolvedValueOnce({ user: ME_FIXTURE.user });

    await app.inject({
      method: 'PUT',
      url: '/api/v1/users/profile',
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
      payload: {
        firstName: 'Jane',
        last_name: 'Smith',
        phone_number: '+1234',
        bio: 'hi',
      },
    });

    const [grpcReq] = auth.updateAccountMock.mock.calls[0] as [UpdateAccountRequest, Metadata];
    expect(grpcReq.firstName).toBe('Jane');
    expect(grpcReq.lastName).toBe('Smith');
    expect(grpcReq.phoneNumber).toBe('+1234');
    expect(grpcReq.bio).toBe('hi');
  });
});

// --- GET /api/v1/users/preferences ----------------------------------

describe('GET /api/v1/users/preferences', () => {
  let app: FastifyInstance;
  let auth: ReturnType<typeof makeAuthClient>;
  let notif: ReturnType<typeof makeNotifClient>;

  beforeEach(async () => {
    auth = makeAuthClient();
    notif = makeNotifClient();
    app = await buildApp(auth, notif);
  });
  afterEach(async () => {
    await app.close();
  });

  it('composes the monolith-shaped preferences from both backing services', async () => {
    notif.getNotificationPreferencesMock.mockResolvedValueOnce({
      preferences: NOTIF_PREFS_FIXTURE,
    });
    auth.getPrivacyPreferencesMock.mockResolvedValueOnce({ preferences: PRIVACY_PREFS_FIXTURE });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/preferences',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      success: true,
      data: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        privacySettings: {
          profileVisibility: 'rescues_only',
          showLocation: true,
          showContactInfo: false,
        },
      },
    });
  });

  it('propagates a gRPC NOT_FOUND from either backing call as a 404', async () => {
    notif.getNotificationPreferencesMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'gone',
    });
    auth.getPrivacyPreferencesMock.mockResolvedValueOnce({ preferences: PRIVACY_PREFS_FIXTURE });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/preferences',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(404);
  });
});

// --- PUT /api/v1/users/preferences ----------------------------------

describe('PUT /api/v1/users/preferences', () => {
  let app: FastifyInstance;
  let auth: ReturnType<typeof makeAuthClient>;
  let notif: ReturnType<typeof makeNotifClient>;

  beforeEach(async () => {
    auth = makeAuthClient();
    notif = makeNotifClient();
    app = await buildApp(auth, notif);
  });
  afterEach(async () => {
    await app.close();
  });

  it('splits the body across notif + privacy update RPCs', async () => {
    notif.updateNotificationPreferencesMock.mockResolvedValueOnce({
      preferences: { ...NOTIF_PREFS_FIXTURE, emailEnabled: false },
    });
    auth.updatePrivacyPreferencesMock.mockResolvedValueOnce({
      preferences: {
        ...PRIVACY_PREFS_FIXTURE,
        profileVisibility: AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PRIVATE,
        showLocation: false,
      },
    });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/preferences',
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
      payload: {
        emailNotifications: false,
        privacySettings: { profileVisibility: 'private', showLocation: false },
      },
    });

    expect(res.statusCode).toBe(200);

    const [notifReq] = notif.updateNotificationPreferencesMock.mock.calls[0] as [
      UpdateNotificationPreferencesRequest,
      Metadata,
    ];
    expect(notifReq.emailEnabled).toBe(false);

    const [privReq] = auth.updatePrivacyPreferencesMock.mock.calls[0] as [
      UpdatePrivacyPreferencesRequest,
      Metadata,
    ];
    expect(privReq.profileVisibility).toBe(AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PRIVATE);
    expect(privReq.showLocation).toBe(false);

    const body = res.json() as { data: Record<string, unknown> };
    expect(body.data.emailNotifications).toBe(false);
    expect((body.data.privacySettings as Record<string, unknown>).profileVisibility).toBe(
      'private'
    );
  });

  it('still calls both even when one slice has no fields (handler no-ops)', async () => {
    notif.updateNotificationPreferencesMock.mockResolvedValueOnce({
      preferences: NOTIF_PREFS_FIXTURE,
    });
    auth.updatePrivacyPreferencesMock.mockResolvedValueOnce({
      preferences: PRIVACY_PREFS_FIXTURE,
    });

    await app.inject({
      method: 'PUT',
      url: '/api/v1/users/preferences',
      headers: {
        'x-user-id': 'usr-1',
        'x-user-roles': 'adopter',
        'content-type': 'application/json',
      },
      payload: { emailNotifications: false },
    });

    expect(notif.updateNotificationPreferencesMock).toHaveBeenCalledTimes(1);
    expect(auth.updatePrivacyPreferencesMock).toHaveBeenCalledTimes(1);
  });
});

// --- POST /api/v1/users/preferences/reset ---------------------------

describe('POST /api/v1/users/preferences/reset', () => {
  let app: FastifyInstance;
  let auth: ReturnType<typeof makeAuthClient>;
  let notif: ReturnType<typeof makeNotifClient>;

  beforeEach(async () => {
    auth = makeAuthClient();
    notif = makeNotifClient();
    app = await buildApp(auth, notif);
  });
  afterEach(async () => {
    await app.close();
  });

  it('calls both reset RPCs and returns composed defaults', async () => {
    notif.resetNotificationPreferencesMock.mockResolvedValueOnce({
      preferences: NOTIF_PREFS_FIXTURE,
    });
    auth.resetPrivacyPreferencesMock.mockResolvedValueOnce({ preferences: PRIVACY_PREFS_FIXTURE });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/preferences/reset',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
    });

    expect(res.statusCode).toBe(200);
    expect(notif.resetNotificationPreferencesMock).toHaveBeenCalledTimes(1);
    expect(auth.resetPrivacyPreferencesMock).toHaveBeenCalledTimes(1);
    const body = res.json() as {
      success: boolean;
      message: string;
      data: { emailNotifications: boolean };
    };
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/reset/i);
    expect(body.data.emailNotifications).toBe(true);
  });
});
