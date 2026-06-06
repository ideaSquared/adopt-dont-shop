import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthV1,
  type AssignRoleResponse,
  type GetMeResponse,
  type LoginResponse,
  type LogoutResponse,
  type RefreshTokenResponse,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { registerAuthRoutes } from './auth.js';

function makeClient(): {
  client: AuthClient;
  loginMock: ReturnType<typeof vi.fn>;
  logoutMock: ReturnType<typeof vi.fn>;
  refreshMock: ReturnType<typeof vi.fn>;
  validateMock: ReturnType<typeof vi.fn>;
  getMeMock: ReturnType<typeof vi.fn>;
  assignMock: ReturnType<typeof vi.fn>;
  registerMock: ReturnType<typeof vi.fn>;
  verifyEmailMock: ReturnType<typeof vi.fn>;
  resendVerificationMock: ReturnType<typeof vi.fn>;
  forgotPasswordMock: ReturnType<typeof vi.fn>;
  resetPasswordMock: ReturnType<typeof vi.fn>;
  changePasswordMock: ReturnType<typeof vi.fn>;
  updateAccountMock: ReturnType<typeof vi.fn>;
} {
  const loginMock = vi.fn();
  const logoutMock = vi.fn();
  const refreshMock = vi.fn();
  const validateMock = vi.fn();
  const getMeMock = vi.fn();
  const assignMock = vi.fn();
  const registerMock = vi.fn();
  const verifyEmailMock = vi.fn();
  const resendVerificationMock = vi.fn();
  const forgotPasswordMock = vi.fn();
  const resetPasswordMock = vi.fn();
  const changePasswordMock = vi.fn();
  const updateAccountMock = vi.fn();
  const client: AuthClient = {
    login: loginMock,
    logout: logoutMock,
    refreshToken: refreshMock,
    validateToken: validateMock,
    getMe: getMeMock,
    assignRole: assignMock,
    register: registerMock,
    verifyEmail: verifyEmailMock,
    resendVerification: resendVerificationMock,
    forgotPassword: forgotPasswordMock,
    resetPassword: resetPasswordMock,
    changePassword: changePasswordMock,
    updateAccount: updateAccountMock,
    close: vi.fn(),
  };
  return {
    client,
    loginMock,
    logoutMock,
    refreshMock,
    validateMock,
    getMeMock,
    assignMock,
    registerMock,
    verifyEmailMock,
    resendVerificationMock,
    forgotPasswordMock,
    resetPasswordMock,
    changePasswordMock,
    updateAccountMock,
  };
}

async function makeApp(client: AuthClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerAuthRoutes(app, { client });
  return app;
}

const LOGIN_RES: LoginResponse = {
  user: {
    userId: 'usr-1',
    email: 'alex@example.com',
    userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
    status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
    emailVerified: true,
    phoneVerified: false,
    twoFactorEnabled: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  tokens: {
    accessToken: 'a.jwt',
    refreshToken: 'r.jwt',
    accessExpiresAt: '2026-06-05T18:30:00Z',
    refreshExpiresAt: '2026-07-05T18:00:00Z',
  },
  permissions: ['pets.read'],
};

describe('POST /api/v1/auth/login', () => {
  let app: FastifyInstance;
  let loginMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    loginMock = m.loginMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('forwards email/password to AuthService.Login + threads ipAddress + userAgent', async () => {
    loginMock.mockResolvedValueOnce(LOGIN_RES);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'user-agent': 'vitest' },
      payload: { email: 'alex@example.com', password: 'hunter2' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { user: { email: string }; tokens: { accessToken: string } };
    expect(body.user.email).toBe('alex@example.com');
    expect(body.tokens.accessToken).toBe('a.jwt');

    const [req] = loginMock.mock.calls[0];
    expect(req.email).toBe('alex@example.com');
    expect(req.password).toBe('hunter2');
    expect(req.userAgent).toBe('vitest');
    expect(req.ipAddress).toBeDefined();
  });

  it('maps UNAUTHENTICATED → 401', async () => {
    loginMock.mockRejectedValueOnce(
      Object.assign(new Error('invalid credentials'), {
        code: grpcStatus.UNAUTHENTICATED,
        details: 'invalid credentials',
      })
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'alex@example.com', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'invalid credentials' });
  });

  it('maps INVALID_ARGUMENT → 400 on missing email', async () => {
    loginMock.mockRejectedValueOnce(
      Object.assign(new Error('email is required'), {
        code: grpcStatus.INVALID_ARGUMENT,
        details: 'email is required',
      })
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { password: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/v1/auth/logout', () => {
  let app: FastifyInstance;
  let logoutMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    logoutMock = m.logoutMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('forwards the refreshToken body field + x-user-* metadata', async () => {
    const logoutRes: LogoutResponse = { revoked: true };
    logoutMock.mockResolvedValueOnce(logoutRes);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      payload: { refreshToken: 'r.jwt' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ revoked: true });
    const [req, metadata] = logoutMock.mock.calls[0];
    expect(req.refreshToken).toBe('r.jwt');
    expect(metadata.get('x-user-id')[0]).toBe('usr-1');
  });
});

describe('POST /api/v1/auth/refresh-token', () => {
  it('forwards the refreshToken and returns the rotated TokenPair', async () => {
    const { client, refreshMock } = makeClient();
    const app = await makeApp(client);
    try {
      const refreshRes: RefreshTokenResponse = {
        tokens: {
          accessToken: 'a2.jwt',
          refreshToken: 'r2.jwt',
          accessExpiresAt: '2026-06-05T19:00:00Z',
          refreshExpiresAt: '2026-07-05T19:00:00Z',
        },
      };
      refreshMock.mockResolvedValueOnce(refreshRes);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh-token',
        payload: { refreshToken: 'r.jwt' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { tokens: { accessToken: string } };
      expect(body.tokens.accessToken).toBe('a2.jwt');
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/auth/me', () => {
  it('threads x-user-* metadata to GetMe and returns the user + roles + permissions', async () => {
    const { client, getMeMock } = makeClient();
    const app = await makeApp(client);
    try {
      const getMeRes: GetMeResponse = {
        user: LOGIN_RES.user!,
        roles: [AuthV1.UserRole.USER_ROLE_ADOPTER],
        permissions: ['pets.read'],
      };
      getMeMock.mockResolvedValueOnce(getMeRes);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { 'x-user-id': 'usr-1', 'x-user-roles': 'adopter' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as { user: { userId: string }; permissions: string[] };
      expect(body.user.userId).toBe('usr-1');
      expect(body.permissions).toEqual(['pets.read']);
      const [, metadata] = getMeMock.mock.calls[0];
      expect(metadata.get('x-user-id')[0]).toBe('usr-1');
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/v1/auth/assign-role', () => {
  let app: FastifyInstance;
  let assignMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const m = makeClient();
    assignMock = m.assignMock;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('parses the canonical DB role string and forwards the proto enum value', async () => {
    const assignRes: AssignRoleResponse = {
      roles: [AuthV1.UserRole.USER_ROLE_RESCUE_STAFF],
    };
    assignMock.mockResolvedValueOnce(assignRes);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/assign-role',
      headers: { 'x-user-id': 'usr-admin', 'x-user-roles': 'admin' },
      payload: { targetUserId: 'usr-1', role: 'rescue_staff', reason: 'onboarding' },
    });

    expect(res.statusCode).toBe(200);
    const [req] = assignMock.mock.calls[0];
    expect(req.targetUserId).toBe('usr-1');
    expect(req.role).toBe(AuthV1.UserRole.USER_ROLE_RESCUE_STAFF);
    expect(req.reason).toBe('onboarding');
  });

  it('accepts the SCREAMING proto form as well', async () => {
    assignMock.mockResolvedValueOnce({ roles: [] });
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/assign-role',
      payload: { targetUserId: 'usr-1', role: 'USER_ROLE_MODERATOR' },
    });
    const [req] = assignMock.mock.calls[0];
    expect(req.role).toBe(AuthV1.UserRole.USER_ROLE_MODERATOR);
  });

  it('coerces an unknown role to UNSPECIFIED so the service returns INVALID_ARGUMENT', async () => {
    assignMock.mockResolvedValueOnce({ roles: [] });
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/assign-role',
      payload: { targetUserId: 'usr-1', role: 'not_a_role' },
    });
    const [req] = assignMock.mock.calls[0];
    expect(req.role).toBe(AuthV1.UserRole.USER_ROLE_UNSPECIFIED);
  });

  it('maps PERMISSION_DENIED → 403', async () => {
    assignMock.mockRejectedValueOnce(
      Object.assign(new Error('forbidden'), {
        code: grpcStatus.PERMISSION_DENIED,
        details: 'admin.security.manage required',
      })
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/assign-role',
      payload: { targetUserId: 'usr-1', role: 'admin' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'admin.security.manage required' });
  });
});

describe('error mapping fallback', () => {
  it('maps an unknown gRPC code → 500', async () => {
    const { client, loginMock } = makeClient();
    const app = await makeApp(client);
    try {
      loginMock.mockRejectedValueOnce(new Error('connection refused'));
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'a@b', password: 'c' },
      });
      expect(res.statusCode).toBe(500);
    } finally {
      await app.close();
    }
  });
});

describe('auth account-lifecycle routes', () => {
  it('POST /auth/register threads body fields + ip/UA, returns 201', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.registerMock.mockResolvedValueOnce({ permissions: [] });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'user-agent': 'vitest' },
        payload: {
          email: 'a@example.com',
          password: 'longenoughpw',
          firstName: 'A',
          lastName: 'B',
          termsAccepted: true,
          privacyPolicyAccepted: true,
        },
      });
      expect(res.statusCode).toBe(201);
      expect(m.registerMock.mock.calls[0][0]).toMatchObject({
        email: 'a@example.com',
        firstName: 'A',
        lastName: 'B',
        termsAccepted: true,
        privacyPolicyAccepted: true,
        userAgent: 'vitest',
      });
    } finally {
      await app.close();
    }
  });

  it('POST /auth/register accepts snake_case keys too', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.registerMock.mockResolvedValueOnce({ permissions: [] });
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'a@example.com',
          password: 'longenoughpw',
          first_name: 'A',
          last_name: 'B',
          terms_accepted: true,
          privacy_policy_accepted: true,
        },
      });
      expect(m.registerMock.mock.calls[0][0]).toMatchObject({
        firstName: 'A',
        termsAccepted: true,
        privacyPolicyAccepted: true,
      });
    } finally {
      await app.close();
    }
  });

  it('POST /auth/verify-email threads the token (camel or snake)', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.verifyEmailMock.mockResolvedValueOnce({});
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { verification_token: 'tok' },
      });
      expect(m.verifyEmailMock.mock.calls[0][0].verificationToken).toBe('tok');
    } finally {
      await app.close();
    }
  });

  it('POST /auth/forgot-password threads email', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.forgotPasswordMock.mockResolvedValueOnce({ ok: true });
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'a@example.com' },
      });
      expect(m.forgotPasswordMock.mock.calls[0][0].email).toBe('a@example.com');
    } finally {
      await app.close();
    }
  });

  it('POST /auth/reset-password threads token + new password', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.resetPasswordMock.mockResolvedValueOnce({ ok: true });
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: { resetToken: 't', newPassword: 'longenoughpw' },
      });
      expect(m.resetPasswordMock.mock.calls[0][0]).toMatchObject({
        resetToken: 't',
        newPassword: 'longenoughpw',
      });
    } finally {
      await app.close();
    }
  });

  it('POST /auth/change-password threads current + new', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.changePasswordMock.mockResolvedValueOnce({ ok: true });
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        payload: { currentPassword: 'old', newPassword: 'longenoughpw' },
      });
      expect(m.changePasswordMock.mock.calls[0][0]).toMatchObject({
        currentPassword: 'old',
        newPassword: 'longenoughpw',
      });
    } finally {
      await app.close();
    }
  });

  it('PATCH /users/account threads only the supplied fields', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.updateAccountMock.mockResolvedValueOnce({});
      await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/account',
        payload: { first_name: 'Joey', timezone: 'Europe/London' },
      });
      const sent = m.updateAccountMock.mock.calls[0][0];
      expect(sent.firstName).toBe('Joey');
      expect(sent.timezone).toBe('Europe/London');
      expect(sent.lastName).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it('GET /users/account is an alias for getMe', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.getMeMock.mockResolvedValueOnce({ user: { userId: 'u1' } });
      const res = await app.inject({ method: 'GET', url: '/api/v1/users/account' });
      expect(res.statusCode).toBe(200);
      expect(m.getMeMock).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });
});
