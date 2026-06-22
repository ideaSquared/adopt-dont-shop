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
  searchUsersMock: ReturnType<typeof vi.fn>;
  adminGetUserMock: ReturnType<typeof vi.fn>;
  adminCreateUserMock: ReturnType<typeof vi.fn>;
  adminUpdateUserMock: ReturnType<typeof vi.fn>;
  deactivateUserMock: ReturnType<typeof vi.fn>;
  reactivateUserMock: ReturnType<typeof vi.fn>;
  getUserStatisticsMock: ReturnType<typeof vi.fn>;
  getUserPermissionsMock: ReturnType<typeof vi.fn>;
  bulkUpdateUsersMock: ReturnType<typeof vi.fn>;
  adminResetPasswordMock: ReturnType<typeof vi.fn>;
} {
  const getMeMock = vi.fn();
  const updateAccountMock = vi.fn();
  const getPrivacyPreferencesMock = vi.fn();
  const updatePrivacyPreferencesMock = vi.fn();
  const resetPrivacyPreferencesMock = vi.fn();
  const searchUsersMock = vi.fn();
  const adminGetUserMock = vi.fn();
  const adminCreateUserMock = vi.fn();
  const adminUpdateUserMock = vi.fn();
  const deactivateUserMock = vi.fn();
  const reactivateUserMock = vi.fn();
  const getUserStatisticsMock = vi.fn();
  const getUserPermissionsMock = vi.fn();
  const bulkUpdateUsersMock = vi.fn();
  const adminResetPasswordMock = vi.fn();
  return {
    getMe: getMeMock,
    updateAccount: updateAccountMock,
    getPrivacyPreferences: getPrivacyPreferencesMock,
    updatePrivacyPreferences: updatePrivacyPreferencesMock,
    resetPrivacyPreferences: resetPrivacyPreferencesMock,
    searchUsers: searchUsersMock,
    adminGetUser: adminGetUserMock,
    adminCreateUser: adminCreateUserMock,
    adminUpdateUser: adminUpdateUserMock,
    deactivateUser: deactivateUserMock,
    reactivateUser: reactivateUserMock,
    getUserStatistics: getUserStatisticsMock,
    getUserPermissions: getUserPermissionsMock,
    bulkUpdateUsers: bulkUpdateUsersMock,
    adminResetPassword: adminResetPasswordMock,
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
    searchUsersMock,
    adminGetUserMock,
    adminCreateUserMock,
    adminUpdateUserMock,
    deactivateUserMock,
    reactivateUserMock,
    getUserStatisticsMock,
    getUserPermissionsMock,
    bulkUpdateUsersMock,
    adminResetPasswordMock,
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

// --- Admin user management ------------------------------------------

const ADMIN_USER_FIXTURE = {
  userId: 'usr-9',
  email: 'target@example.com',
  firstName: 'Target',
  lastName: 'User',
  userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
  status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
  emailVerified: true,
  phoneVerified: false,
  twoFactorEnabled: false,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
} as unknown as AuthV1.User;

describe('GET /api/v1/users/search', () => {
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

  it('forwards filters + pagination and returns the SPA envelope', async () => {
    auth.searchUsersMock.mockResolvedValueOnce({
      users: [ADMIN_USER_FIXTURE],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/search?search=jane&status=active&userType=adopter&page=1&limit=20',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: Array<{ userId: string }>;
      pagination: { total: number; totalPages: number };
    };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);

    const [grpcReq] = auth.searchUsersMock.mock.calls[0] as [SearchUsersReqShape, Metadata];
    expect(grpcReq.search).toBe('jane');
    expect(grpcReq.statusFilter).toBe(AuthV1.UserStatus.USER_STATUS_ACTIVE);
    expect(grpcReq.userTypeFilter).toBe(AuthV1.UserRole.USER_ROLE_ADOPTER);
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    auth.searchUsersMock.mockRejectedValueOnce({ code: status.PERMISSION_DENIED, details: 'no' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/search',
      headers: { 'x-user-id': 'usr-1' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('does not shadow GET /profile (static segment wins)', async () => {
    auth.getMeMock.mockResolvedValueOnce(ME_FIXTURE);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/profile',
      headers: { 'x-user-id': 'usr-1' },
    });
    expect(res.statusCode).toBe(200);
    expect(auth.getMeMock).toHaveBeenCalledTimes(1);
    expect(auth.searchUsersMock).not.toHaveBeenCalled();
    expect(auth.adminGetUserMock).not.toHaveBeenCalled();
  });
});

type SearchUsersReqShape = {
  search?: string;
  statusFilter: AuthV1.UserStatus;
  userTypeFilter: AuthV1.UserRole;
};

describe('/api/v1/admin/users surface', () => {
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

  it('GET lists users with canonical status/userType strings', async () => {
    auth.searchUsersMock.mockResolvedValueOnce({
      users: [ADMIN_USER_FIXTURE],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users?limit=50',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: Array<{ userType: string; status: string }> };
    expect(body.data[0].userType).toBe('adopter');
    expect(body.data[0].status).toBe('active');
  });

  it('GET :userId returns the user with a canonical status string', async () => {
    auth.adminGetUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users/usr-9',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { userId: string; status: string } };
    expect(body.data.userId).toBe('usr-9');
    expect(body.data.status).toBe('active');
  });

  it('PATCH action=suspend sets status SUSPENDED and returns "suspended"', async () => {
    const suspended = { ...ADMIN_USER_FIXTURE, status: AuthV1.UserStatus.USER_STATUS_SUSPENDED };
    auth.adminUpdateUserMock.mockResolvedValueOnce({ user: suspended });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/users/usr-9/action',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ action: 'suspend', reason: 'probe' }),
    });
    expect(res.statusCode).toBe(200);
    const [grpcReq] = auth.adminUpdateUserMock.mock.calls[0] as [
      { userId: string; status: AuthV1.UserStatus },
      Metadata,
    ];
    expect(grpcReq.userId).toBe('usr-9');
    expect(grpcReq.status).toBe(AuthV1.UserStatus.USER_STATUS_SUSPENDED);
    const body = res.json() as { data: { status: string } };
    expect(body.data.status).toBe('suspended');
  });

  it('PATCH action=reactivate routes to reactivateUser', async () => {
    auth.reactivateUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/users/usr-9/action',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ action: 'reactivate' }),
    });
    expect(res.statusCode).toBe(200);
    expect(auth.reactivateUserMock).toHaveBeenCalledTimes(1);
    expect(auth.adminUpdateUserMock).not.toHaveBeenCalled();
  });

  it('PATCH with an unknown action → 400 without calling any RPC', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/users/usr-9/action',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ action: 'frobnicate' }),
    });
    expect(res.statusCode).toBe(400);
    expect(auth.adminUpdateUserMock).not.toHaveBeenCalled();
    expect(auth.reactivateUserMock).not.toHaveBeenCalled();
  });

  it('POST creates a user, mapping role → userType and 201ing the new user', async () => {
    auth.adminCreateUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'adopter',
        send_invitation: true,
      }),
    });
    expect(res.statusCode).toBe(201);
    const [grpcReq] = auth.adminCreateUserMock.mock.calls[0] as [
      {
        email: string;
        firstName: string;
        lastName: string;
        userType: AuthV1.UserRole;
        sendInvitation: boolean;
      },
      Metadata,
    ];
    expect(grpcReq).toMatchObject({
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
      sendInvitation: true,
    });
    const body = res.json() as { success: boolean; data: { userId: string } };
    expect(body.success).toBe(true);
    expect(body.data.userId).toBe('usr-9');
  });

  it('POST defaults send_invitation to true when omitted', async () => {
    auth.adminCreateUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'moderator',
      }),
    });
    const [grpcReq] = auth.adminCreateUserMock.mock.calls[0] as [
      { sendInvitation: boolean },
      Metadata,
    ];
    expect(grpcReq.sendInvitation).toBe(true);
  });

  it('POST with a missing email → 400 without calling the RPC', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ first_name: 'New', last_name: 'User', role: 'adopter' }),
    });
    expect(res.statusCode).toBe(400);
    expect(auth.adminCreateUserMock).not.toHaveBeenCalled();
  });

  it('POST with an invalid role → 400 without calling the RPC', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'wizard',
      }),
    });
    expect(res.statusCode).toBe(400);
    expect(auth.adminCreateUserMock).not.toHaveBeenCalled();
  });

  it('POST surfaces a gRPC PERMISSION_DENIED as 403', async () => {
    auth.adminCreateUserMock.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: 'no',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        email: 'boss@example.com',
        first_name: 'Boss',
        last_name: 'Person',
        role: 'super_admin',
      }),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/v1/admin/users/:userId/reset-password', () => {
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

  it('returns the temporary password under the snake_case key the SPA reads', async () => {
    auth.adminResetPasswordMock.mockResolvedValueOnce({ temporaryPassword: 'tmp-Abc123' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/usr-9/reset-password',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ temporary_password: 'tmp-Abc123' });
    const [grpcReq] = auth.adminResetPasswordMock.mock.calls[0] as [{ userId: string }, Metadata];
    expect(grpcReq.userId).toBe('usr-9');
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    auth.adminResetPasswordMock.mockRejectedValueOnce({
      code: status.PERMISSION_DENIED,
      details: 'no',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/usr-9/reset-password',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('maps NOT_FOUND → 404', async () => {
    auth.adminResetPasswordMock.mockRejectedValueOnce({
      code: status.NOT_FOUND,
      details: 'gone',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/ghost/reset-password',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/v1/users/statistics', () => {
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

  it('returns the stats payload', async () => {
    auth.getUserStatisticsMock.mockResolvedValueOnce({
      total: 100,
      verified: 80,
      newThisMonth: 12,
      byStatus: [],
      byType: [],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/statistics',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; data: { total: number } };
    expect(body.data.total).toBe(100);
  });
});

describe('GET/PUT /api/v1/users/:userId', () => {
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

  it('GET returns the user', async () => {
    auth.adminGetUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/usr-9',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { userId: string } };
    expect(body.data.userId).toBe('usr-9');
  });

  it('GET maps NOT_FOUND → 404', async () => {
    auth.adminGetUserMock.mockRejectedValueOnce({ code: status.NOT_FOUND, details: 'gone' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/ghost',
      headers: { 'x-user-id': 'svc-admin' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('PUT maps status + userType body fields', async () => {
    auth.adminUpdateUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/users/usr-9',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: { status: 'suspended', userType: 'moderator', emailVerified: true },
    });
    const [grpcReq] = auth.adminUpdateUserMock.mock.calls[0] as [
      {
        userId: string;
        status: AuthV1.UserStatus;
        userType: AuthV1.UserRole;
        emailVerified?: boolean;
      },
      Metadata,
    ];
    expect(grpcReq.userId).toBe('usr-9');
    expect(grpcReq.status).toBe(AuthV1.UserStatus.USER_STATUS_SUSPENDED);
    expect(grpcReq.userType).toBe(AuthV1.UserRole.USER_ROLE_MODERATOR);
    expect(grpcReq.emailVerified).toBe(true);
  });
});

describe('POST /api/v1/users/:userId/{deactivate,reactivate}', () => {
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

  it('deactivate forwards reason', async () => {
    auth.deactivateUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    await app.inject({
      method: 'POST',
      url: '/api/v1/users/usr-9/deactivate',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: { reason: 'abuse' },
    });
    const [grpcReq] = auth.deactivateUserMock.mock.calls[0] as [
      { userId: string; reason?: string },
      Metadata,
    ];
    expect(grpcReq.userId).toBe('usr-9');
    expect(grpcReq.reason).toBe('abuse');
  });

  it('reactivate returns success', async () => {
    auth.reactivateUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/usr-9/reactivate',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    expect(auth.reactivateUserMock).toHaveBeenCalledTimes(1);
  });
});

// --- Admin role + permissions + bulk --------------------------------

describe('user permissions + role + bulk routes', () => {
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

  it('GET /:userId/permissions returns the permission list', async () => {
    auth.getUserPermissionsMock.mockResolvedValueOnce({
      permissions: ['pets.read', 'pets.update'],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/usr-9/permissions',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { permissions: string[] } };
    expect(body.data.permissions).toEqual(['pets.read', 'pets.update']);
  });

  it('GET /:userId/with-permissions composes user + permissions', async () => {
    auth.adminGetUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    auth.getUserPermissionsMock.mockResolvedValueOnce({ permissions: ['pets.read'] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/usr-9/with-permissions',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: { userId: string; permissions: string[] } };
    expect(body.data.userId).toBe('usr-9');
    expect(body.data.permissions).toEqual(['pets.read']);
  });

  it('PUT /:userId/role maps the role body to AdminUpdateUser user_type', async () => {
    auth.adminUpdateUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/users/usr-9/role',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: { role: 'moderator' },
    });
    const [grpcReq] = auth.adminUpdateUserMock.mock.calls[0] as [
      { userId: string; userType: AuthV1.UserRole },
      Metadata,
    ];
    expect(grpcReq.userId).toBe('usr-9');
    expect(grpcReq.userType).toBe(AuthV1.UserRole.USER_ROLE_MODERATOR);
  });

  it('POST /bulk-update forwards ids + status and returns the summary', async () => {
    auth.bulkUpdateUsersMock.mockResolvedValueOnce({
      successCount: 2,
      failedCount: 0,
      results: [
        { userId: 'a', success: true },
        { userId: 'b', success: true },
      ],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/bulk-update',
      headers: {
        'x-user-id': 'svc-admin',
        'x-user-roles': 'admin',
        'content-type': 'application/json',
      },
      payload: { userIds: ['a', 'b'], status: 'suspended' },
    });
    expect(res.statusCode).toBe(200);
    const [grpcReq] = auth.bulkUpdateUsersMock.mock.calls[0] as [
      { userIds: string[]; status: AuthV1.UserStatus },
      Metadata,
    ];
    expect(grpcReq.userIds).toEqual(['a', 'b']);
    expect(grpcReq.status).toBe(AuthV1.UserStatus.USER_STATUS_SUSPENDED);
  });

  it('POST /bulk-update does not collide with GET /:userId', async () => {
    auth.adminGetUserMock.mockResolvedValueOnce({ user: ADMIN_USER_FIXTURE });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/bulk-update',
      headers: { 'x-user-id': 'svc-admin', 'x-user-roles': 'admin' },
    });
    // GET falls to adminGetUser with userId='bulk-update' — the POST
    // route is method-scoped so there's no shadowing.
    expect(res.statusCode).toBe(200);
    expect(auth.bulkUpdateUsersMock).not.toHaveBeenCalled();
  });
});
