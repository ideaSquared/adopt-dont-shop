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
import { createEmailRateLimiter } from './email-rate-limiter.js';

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
  redeemInvitationMock: ReturnType<typeof vi.fn>;
  changePasswordMock: ReturnType<typeof vi.fn>;
  setupTwoFactorMock: ReturnType<typeof vi.fn>;
  enableTwoFactorMock: ReturnType<typeof vi.fn>;
  disableTwoFactorMock: ReturnType<typeof vi.fn>;
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
  const redeemInvitationMock = vi.fn();
  const changePasswordMock = vi.fn();
  const setupTwoFactorMock = vi.fn();
  const enableTwoFactorMock = vi.fn();
  const disableTwoFactorMock = vi.fn();
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
    redeemInvitation: redeemInvitationMock,
    changePassword: changePasswordMock,
    setupTwoFactor: setupTwoFactorMock,
    enableTwoFactor: enableTwoFactorMock,
    disableTwoFactor: disableTwoFactorMock,
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
    redeemInvitationMock,
    changePasswordMock,
    setupTwoFactorMock,
    enableTwoFactorMock,
    disableTwoFactorMock,
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
    const body = res.json() as {
      user: { email: string; userType: string; status: string };
      tokens: { accessToken: string };
    };
    expect(body.user.email).toBe('alex@example.com');
    // The SPA speaks the canonical DB strings, not the SCREAMING proto enum
    // names — the gateway must normalise these in the body (auth contract).
    expect(body.user.userType).toBe('adopter');
    expect(body.user.status).toBe('active');
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
      const body = res.json() as {
        user: { userId: string; userType: string; status: string };
        roles: string[];
        permissions: string[];
      };
      expect(body.user.userId).toBe('usr-1');
      // Normalised to the canonical DB strings for the SPA.
      expect(body.user.userType).toBe('adopter');
      expect(body.user.status).toBe('active');
      expect(body.roles).toEqual(['adopter']);
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

  it('POST /auth/redeem-invitation threads token + new password, returns the user', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.redeemInvitationMock.mockResolvedValueOnce({
        user: { userId: 'usr-1', email: 'invited@example.com' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/redeem-invitation',
        payload: { invitationToken: 'tok', newPassword: 'longenoughpw' },
      });
      expect(m.redeemInvitationMock.mock.calls[0][0]).toMatchObject({
        invitationToken: 'tok',
        newPassword: 'longenoughpw',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        user: { userId: 'usr-1', email: 'invited@example.com' },
      });
    } finally {
      await app.close();
    }
  });

  it('POST /auth/redeem-invitation surfaces an invalid token as 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.redeemInvitationMock.mockRejectedValueOnce({
        code: grpcStatus.INVALID_ARGUMENT,
        message: 'invalid or expired invitation token',
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/redeem-invitation',
        payload: { invitationToken: 'bad', newPassword: 'longenoughpw' },
      });
      expect(res.statusCode).toBe(400);
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

describe('auth account-lifecycle input validation (ADS-853)', () => {
  it('POST /auth/register defaults missing fields without invoking the client unsafely', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.registerMock.mockResolvedValueOnce({ permissions: [] });
      // Only email + password supplied — the rest must default exactly as before.
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'a@example.com', password: 'longenoughpw' },
      });
      expect(m.registerMock.mock.calls[0][0]).toMatchObject({
        email: 'a@example.com',
        password: 'longenoughpw',
        firstName: '',
        lastName: '',
        termsAccepted: false,
        privacyPolicyAccepted: false,
      });
      expect(m.registerMock.mock.calls[0][0].phoneNumber).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it('POST /auth/register rejects a non-string string field with 400, not a downstream call', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 123, password: 'longenoughpw' },
      });
      expect(res.statusCode).toBe(400);
      expect(m.registerMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('POST /auth/register rejects a non-boolean terms flag with 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'a@example.com', password: 'pw', termsAccepted: 'yes' },
      });
      expect(res.statusCode).toBe(400);
      expect(m.registerMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('POST /auth/verify-email rejects a non-string token with 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: { verificationToken: 42 },
      });
      expect(res.statusCode).toBe(400);
      expect(m.verifyEmailMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('POST /auth/resend-verification rejects a non-string email with 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/resend-verification',
        payload: { email: false },
      });
      expect(res.statusCode).toBe(400);
      expect(m.resendVerificationMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('POST /auth/forgot-password rejects a non-string email with 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: { nested: true } },
      });
      expect(res.statusCode).toBe(400);
      expect(m.forgotPasswordMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('POST /auth/reset-password rejects a non-string new password with 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: { resetToken: 't', newPassword: 999 },
      });
      expect(res.statusCode).toBe(400);
      expect(m.resetPasswordMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('POST /auth/change-password rejects a non-string field with 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        payload: { currentPassword: 'old', newPassword: [] },
      });
      expect(res.statusCode).toBe(400);
      expect(m.changePasswordMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('PATCH /users/account rejects a non-string field with 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/account',
        payload: { firstName: 7 },
      });
      expect(res.statusCode).toBe(400);
      expect(m.updateAccountMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('falls through camelCase to snake_case only when the camel key is absent', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.registerMock.mockResolvedValueOnce({ permissions: [] });
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'a@example.com',
          password: 'pw',
          first_name: 'SnakeFirst',
          lastName: 'CamelLast',
        },
      });
      expect(m.registerMock.mock.calls[0][0]).toMatchObject({
        firstName: 'SnakeFirst',
        lastName: 'CamelLast',
      });
    } finally {
      await app.close();
    }
  });
});

describe('auth rate limiting (ADS-844)', () => {
  it('throttles a per-EMAIL flood spread across many IPs', async () => {
    const m = makeClient();
    m.forgotPasswordMock.mockResolvedValue({ ok: true });
    const app = Fastify({ logger: false, trustProxy: true });
    // ~3/min/email cap for the test. The per-IP plugin is intentionally NOT
    // registered here so only the per-email preHandler can produce a 429.
    const emailRateLimiter = createEmailRateLimiter({ max: 3, windowMs: 60_000 });
    await registerAuthRoutes(app, { client: m.client, emailRateLimiter });
    try {
      const hit = (ip: string) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/auth/forgot-password',
          // Vary the client IP each call — the per-IP cap would never fire.
          headers: { 'x-forwarded-for': ip },
          payload: { email: 'victim@example.com' },
        });

      const statuses = [
        (await hit('1.1.1.1')).statusCode,
        (await hit('2.2.2.2')).statusCode,
        (await hit('3.3.3.3')).statusCode,
        (await hit('4.4.4.4')).statusCode,
      ];

      // First 3 (the cap) pass; the 4th — same email, different IP — is 429.
      expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
      expect(statuses[3]).toBe(429);
    } finally {
      await app.close();
    }
  });

  it('case/whitespace variants of the same email share the cap', async () => {
    const m = makeClient();
    m.forgotPasswordMock.mockResolvedValue({ ok: true });
    const app = Fastify({ logger: false, trustProxy: true });
    const emailRateLimiter = createEmailRateLimiter({ max: 1, windowMs: 60_000 });
    await registerAuthRoutes(app, { client: m.client, emailRateLimiter });
    try {
      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'Victim@Example.com' },
      });
      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: '  victim@example.COM ' },
      });
      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });

  it('throttles a per-IP flood (per-IP @fastify/rate-limit still applies)', async () => {
    const m = makeClient();
    m.forgotPasswordMock.mockResolvedValue({ ok: true });
    const app = Fastify({ logger: false, trustProxy: true });
    const { default: rateLimit } = await import('@fastify/rate-limit');
    await app.register(rateLimit, {
      global: true,
      max: 100,
      timeWindow: '1 minute',
      keyGenerator: req => req.ip,
    });
    // No per-email limiter wired — only the per-IP plugin gates. The route's
    // own config.rateLimit (forgot-password = 5/min/IP) is the effective cap.
    await registerAuthRoutes(app, { client: m.client });
    try {
      const sameIp = { 'x-forwarded-for': '9.9.9.9' };
      const statuses: number[] = [];
      // Vary the email each call so it's unambiguously the per-IP cap firing.
      for (let i = 0; i < 6; i += 1) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/forgot-password',
          headers: sameIp,
          payload: { email: `flood-${i}@example.com` },
        });
        statuses.push(res.statusCode);
      }
      // 5 within the per-IP cap pass; the 6th from the same IP is 429.
      expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
      expect(statuses[5]).toBe(429);
    } finally {
      await app.close();
    }
  });
});

describe('two-factor routes', () => {
  it('POST /auth/2fa/setup returns the secret + otpauth URL', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.setupTwoFactorMock.mockResolvedValueOnce({
        secret: 'BASE32SECRET',
        otpauthUrl: 'otpauth://totp/AdoptDontShop:a@b.com?secret=BASE32SECRET',
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/2fa/setup',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { secret: string; otpauthUrl: string };
      expect(body.secret).toBe('BASE32SECRET');
      expect(body.otpauthUrl).toContain('otpauth://');
    } finally {
      await app.close();
    }
  });

  it('POST /auth/2fa/setup maps the already-enabled 400', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.setupTwoFactorMock.mockRejectedValueOnce({
        code: grpcStatus.INVALID_ARGUMENT,
        details: 'two-factor authentication is already enabled',
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/2fa/setup',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.toLowerCase()).toContain('already enabled');
    } finally {
      await app.close();
    }
  });

  it('POST /auth/2fa/enable threads secret + token', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.enableTwoFactorMock.mockResolvedValueOnce({ enabled: true });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/2fa/enable',
        headers: { 'x-user-id': 'usr-1', 'content-type': 'application/json' },
        payload: { secret: 'S', token: '123456' },
      });
      expect(res.statusCode).toBe(200);
      const [grpcReq] = m.enableTwoFactorMock.mock.calls[0] as [{ secret: string; token: string }];
      expect(grpcReq.secret).toBe('S');
      expect(grpcReq.token).toBe('123456');
    } finally {
      await app.close();
    }
  });

  it('POST /auth/2fa/disable threads the token', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.disableTwoFactorMock.mockResolvedValueOnce({ disabled: true });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/2fa/disable',
        headers: { 'x-user-id': 'usr-1', 'content-type': 'application/json' },
        payload: { token: '654321' },
      });
      expect(res.statusCode).toBe(200);
      const [grpcReq] = m.disableTwoFactorMock.mock.calls[0] as [{ token: string }];
      expect(grpcReq.token).toBe('654321');
    } finally {
      await app.close();
    }
  });

  it('login threads the TOTP token and surfaces two_factor_required', async () => {
    const m = makeClient();
    const app = await makeApp(m.client);
    try {
      m.loginMock.mockResolvedValueOnce({ permissions: [], twoFactorRequired: true });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'content-type': 'application/json' },
        payload: { email: 'a@b.com', password: 'pw', twoFactorToken: '111111' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { twoFactorRequired?: boolean };
      expect(body.twoFactorRequired).toBe(true);
      const [grpcReq] = m.loginMock.mock.calls[0] as [{ twoFactorToken?: string }];
      expect(grpcReq.twoFactorToken).toBe('111111');
    } finally {
      await app.close();
    }
  });
});
