// REST → gRPC translation for /api/v1/auth/*.
//
// Phase 2.6 cutover: this Fastify plugin registers BEFORE the
// strangler-fig http-proxy catch-all, so Fastify's first-registered-
// wins prefix routing picks it for /api/v1/auth/* requests before the
// catch-all sees them. Same shape as routes/notifications.ts.
//
// Route map (matches the monolith's existing /api/v1/auth/* surface so
// the SPA + lib.auth React contexts don't have to change):
//
//   POST /api/v1/auth/login           → AuthService.Login
//   POST /api/v1/auth/logout          → AuthService.Logout
//   POST /api/v1/auth/refresh-token   → AuthService.RefreshToken
//   GET  /api/v1/auth/me              → AuthService.GetMe
//   POST /api/v1/auth/assign-role     → AuthService.AssignRole  (admin-only)
//
// The authenticate middleware (Phase 2.5) already populates the
// x-user-* metadata headers for routes whose handler relies on the
// principal — Logout, GetMe, AssignRole. Login + RefreshToken don't
// need them (they mint a fresh principal); the middleware passes
// requests with no Authorization header through to the route.

import type { FastifyInstance, FastifyReply, FastifyRequest, RouteShorthandOptions } from 'fastify';

import {
  AuthV1,
  type AssignRoleRequest,
  type LoginRequest,
  type LogoutRequest,
  type RefreshTokenRequest,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

import { normalizeEmail, type EmailRateLimiter } from './email-rate-limiter.js';
import { rolesToApi, withApiUser } from './auth-user-json.js';
import {
  normalizeRegisterBody,
  RegisterBodySchema,
  toValidationFailure,
  normalizeVerifyEmailBody,
  VerifyEmailBodySchema,
  ForgotPasswordBodySchema,
  ResendVerificationBodySchema,
  normalizeResetPasswordBody,
  ResetPasswordBodySchema,
  normalizeRedeemInvitationBody,
  RedeemInvitationBodySchema,
  normalizeChangePasswordBody,
  ChangePasswordBodySchema,
  normalizeUpdateAccountBody,
  UpdateAccountBodySchema,
} from './auth.schemas.js';

export type AuthRoutesOptions = {
  client: AuthClient;
  // Per-email rate limiter (ADS-844). When supplied, the email-bearing
  // unauthenticated routes (register / forgot-password / reset-password /
  // resend-verification) get a per-email cap layered on top of the per-IP
  // @fastify/rate-limit cap. Optional so tests / dev that don't wire it keep
  // the per-IP-only behaviour.
  emailRateLimiter?: EmailRateLimiter;
  // Stricter per-email rate limiter for the login route only (ADS-916).
  // Mirrors the ADS-844 pattern but with a tighter cap/window, so a
  // credential-stuffing attack spread across many source IPs (or a rotating
  // X-Forwarded-For) is still capped per targeted account. Separate from
  // emailRateLimiter because login's threshold (matching the auth-service
  // soft-lock) is deliberately tighter than register/forgot-password's.
  // Optional so tests / dev that don't wire it keep the per-IP-only
  // behaviour.
  loginEmailRateLimiter?: EmailRateLimiter;
  // Called each time the login per-email cap trips. Lets the caller (server.ts)
  // increment a Prometheus counter without this route module reaching into
  // the metrics registry directly.
  onLoginEmailRateLimitTrip?: () => void;
};

// Body shapes accepted by the REST surface. Kept narrow + explicit
// so a client typo doesn't get silently forwarded as `undefined` to
// the proto encoder, where it would land as the empty string.
type LoginBody = {
  email?: string;
  password?: string;
  // The TOTP code, supplied on the second login call when the account has
  // 2FA enabled. Accept a few key spellings the SPA/clients might send.
  twoFactorToken?: string;
  two_factor_token?: string;
  token?: string;
  // A single-use backup/recovery code (ADS-914b), accepted in place of the
  // TOTP code on the second login call.
  backupCode?: string;
  backup_code?: string;
};

type LogoutBody = {
  refreshToken?: string;
};

type RefreshTokenBody = {
  refreshToken?: string;
};

type AssignRoleBody = {
  targetUserId?: string;
  role?: string;
  reason?: string;
};

// Per-route rate limits guard the credential-stuffing surface
// (CodeQL #281). Limits are conservative — login + refresh are the
// hot brute-force targets so they take the tightest cap; assign-role
// is admin-only and gets a wider window. All keyed on req.ip via
// the default key generator. Production deploys can swap in a Redis
// store via the plugin's `redis` option without touching this file.
//
// e2e override: a full Playwright run logs in / registers many times from a
// single docker-side IP, tripping these strict anti-abuse limits. When
// GATEWAY_AUTH_RATE_LIMIT_MAX is set (only in the e2e stack) it raises every
// per-route max; unset in dev/prod, so the strict defaults below stand.
const E2E_AUTH_MAX = Number(process.env.GATEWAY_AUTH_RATE_LIMIT_MAX);
const authMax = (def: number): number =>
  Number.isFinite(E2E_AUTH_MAX) && E2E_AUTH_MAX > 0 ? E2E_AUTH_MAX : def;
const AUTH_RATE_LIMITS = {
  login: { max: authMax(10), timeWindow: '1 minute' },
  logout: { max: authMax(30), timeWindow: '1 minute' },
  refreshToken: { max: authMax(30), timeWindow: '1 minute' },
  getMe: { max: authMax(60), timeWindow: '1 minute' },
  assignRole: { max: authMax(30), timeWindow: '1 minute' },
  // Account lifecycle — tighter on the unauthenticated paths to slow
  // enumeration / spam.
  register: { max: authMax(5), timeWindow: '1 minute' },
  verifyEmail: { max: authMax(10), timeWindow: '1 minute' },
  resendVerification: { max: authMax(5), timeWindow: '1 minute' },
  forgotPassword: { max: authMax(5), timeWindow: '1 minute' },
  resetPassword: { max: authMax(10), timeWindow: '1 minute' },
  redeemInvitation: { max: authMax(10), timeWindow: '1 minute' },
  changePassword: { max: authMax(10), timeWindow: '1 minute' },
  twoFactor: { max: authMax(10), timeWindow: '1 minute' },
  updateAccount: { max: authMax(30), timeWindow: '1 minute' },
} as const;

export const registerAuthRoutes = async (
  app: FastifyInstance,
  opts: AuthRoutesOptions
): Promise<void> => {
  const { client, emailRateLimiter, loginEmailRateLimiter, onLoginEmailRateLimitTrip } = opts;

  // Build a preHandler that caps attempts per normalized email (ADS-844).
  // `extractEmail` pulls the email out of the (already-parsed) body. When no
  // limiter is supplied (defaults to the shared emailRateLimiter), or the
  // body carries no email, the handler is a no-op so behaviour is unchanged.
  // A throttled request gets 429 before reaching the gRPC call. `onTrip` is
  // an optional metrics hook (ADS-916) fired each time the cap trips.
  const emailRateLimit = (
    extractEmail: (body: Record<string, unknown>) => unknown,
    limiter: EmailRateLimiter | undefined = emailRateLimiter,
    onTrip?: () => void
  ): RouteShorthandOptions['preHandler'] => {
    if (!limiter) {
      return undefined;
    }
    return async (req: FastifyRequest, reply: FastifyReply) => {
      const email = normalizeEmail(extractEmail((req.body ?? {}) as Record<string, unknown>));
      if (email === undefined) {
        return;
      }
      const allowed = await limiter.consume(email);
      if (!allowed) {
        onTrip?.();
        return reply.code(429).send({ error: 'Too many requests for this email' });
      }
    };
  };

  // Per-route rate limits use config.rateLimit to override the global
  // limit registered in server.ts. No need to re-register the plugin
  // here — the global registration in createServer() applies the Redis
  // store to these routes automatically; the per-route config.rateLimit
  // objects below set tighter caps on the credential-stuffing surface.
  app.post(
    '/api/v1/auth/login',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.login },
      // Per-email cap layered on top of the per-IP limit above (ADS-916) —
      // catches a credential-stuffing flood against one account spread
      // across many source IPs, which the per-IP cap alone misses.
      preHandler: emailRateLimit(b => b.email, loginEmailRateLimiter, onLoginEmailRateLimitTrip),
      schema: {
        tags: ['auth'],
        summary: 'Exchange email + password for an access token',
        // Login is unauthenticated — override the document-level
        // bearerAuth requirement so the Swagger UI doesn't ask for a
        // token before letting the user try it.
        security: [],
        // Body shape is documentation-only here: we deliberately don't
        // mark email/password as `required` and don't constrain `format`,
        // so the existing handler keeps full control of validation
        // (returns the gRPC INVALID_ARGUMENT → 400 the SPA already
        // expects). The OpenAPI doc still tells consumers what to send.
        body: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            password: { type: 'string' },
            twoFactorToken: { type: 'string' },
            backupCode: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  accessExpiresAt: { type: 'string' },
                  refreshExpiresAt: { type: 'string' },
                },
              },
              user: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  userType: { type: 'string' },
                  status: { type: 'string' },
                },
              },
              permissions: { type: 'array', items: { type: 'string' } },
              twoFactorRequired: { type: 'boolean' },
              emailVerificationRequired: { type: 'boolean' },
              backupCodesExhausted: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as LoginBody;
      const grpcReq: LoginRequest = {
        email: body.email ?? '',
        password: body.password ?? '',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        twoFactorToken: body.twoFactorToken ?? body.two_factor_token ?? body.token,
        backupCode: body.backupCode ?? body.backup_code,
      };

      try {
        const res = await client.login(grpcReq, buildMetadata(req));
        const json = AuthV1.LoginResponse.toJSON(res) as Record<string, unknown>;
        return reply.send(withApiUser(json, res.user));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/logout',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.logout },
      schema: {
        tags: ['auth'],
        summary: 'Invalidate the current session and refresh token',
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              revoked: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as LogoutBody;
      const grpcReq: LogoutRequest = { refreshToken: body.refreshToken ?? '' };

      try {
        const res = await client.logout(grpcReq, buildMetadata(req));
        return reply.send(AuthV1.LogoutResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/refresh-token',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.refreshToken },
      schema: {
        tags: ['auth'],
        summary: 'Exchange a refresh token for a new access token',
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  accessExpiresAt: { type: 'string' },
                  refreshExpiresAt: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as RefreshTokenBody;
      const grpcReq: RefreshTokenRequest = { refreshToken: body.refreshToken ?? '' };

      try {
        const res = await client.refreshToken(grpcReq, buildMetadata(req));
        return reply.send(AuthV1.RefreshTokenResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get(
    '/api/v1/auth/me',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.getMe },
      schema: {
        tags: ['auth'],
        summary: 'Return the principal resolved from the Bearer token',
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  userType: { type: 'string' },
                  status: { type: 'string' },
                  emailVerified: { type: 'boolean' },
                },
              },
              roles: {
                type: 'array',
                items: { type: 'string' },
              },
              permissions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getMe({}, buildMetadata(req));
        const json = AuthV1.GetMeResponse.toJSON(res) as Record<string, unknown>;
        return reply.send({ ...withApiUser(json, res.user), roles: rolesToApi(res.roles ?? []) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/assign-role',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.assignRole },
      schema: {
        tags: ['auth', 'admin'],
        summary: 'Assign a role to a target user (admin only)',
        body: {
          type: 'object',
          properties: {
            targetUserId: { type: 'string' },
            role: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['targetUserId', 'role'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as AssignRoleBody;
      const grpcReq: AssignRoleRequest = {
        targetUserId: body.targetUserId ?? '',
        role: parseRole(body.role),
        reason: body.reason,
      };

      try {
        const res = await client.assignRole(grpcReq, buildMetadata(req));
        return reply.send(AuthV1.AssignRoleResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // --- Account lifecycle routes ---------------------------------------

  app.post(
    '/api/v1/auth/register',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.register },
      preHandler: emailRateLimit(b => b.email ?? b.email_address),
      schema: {
        tags: ['auth'],
        summary: 'Register a new user account',
        security: [],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phoneNumber: { type: 'string' },
            termsAccepted: { type: 'boolean' },
            privacyPolicyAccepted: { type: 'boolean' },
          },
          required: ['email', 'password'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  userType: { type: 'string' },
                  status: { type: 'string' },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const parsed = RegisterBodySchema.safeParse(normalizeRegisterBody(b));
      if (!parsed.success) {
        return reply.code(400).send(toValidationFailure(parsed.error));
      }
      const body = parsed.data;
      try {
        const res = await client.register(
          {
            email: body.email,
            password: body.password,
            firstName: body.firstName,
            lastName: body.lastName,
            phoneNumber: body.phoneNumber,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            termsAccepted: body.termsAccepted,
            privacyPolicyAccepted: body.privacyPolicyAccepted,
          },
          buildMetadata(req)
        );
        const json = AuthV1.RegisterResponse.toJSON(res) as Record<string, unknown>;
        return reply.code(201).send(withApiUser(json, res.user));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/verify-email',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.verifyEmail },
      schema: {
        tags: ['auth'],
        summary: 'Verify email address using a verification token',
        security: [],
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string' },
                  emailVerified: { type: 'boolean' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const parsed = VerifyEmailBodySchema.safeParse(normalizeVerifyEmailBody(b));
      if (!parsed.success) {
        return reply.code(400).send(toValidationFailure(parsed.error));
      }
      try {
        const res = await client.verifyEmail(
          { verificationToken: parsed.data.verificationToken },
          buildMetadata(req)
        );
        const json = AuthV1.VerifyEmailResponse.toJSON(res) as Record<string, unknown>;
        return reply.send(withApiUser(json, res.user));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/resend-verification',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.resendVerification },
      preHandler: emailRateLimit(b => b.email),
      schema: {
        tags: ['auth'],
        summary: 'Resend the email verification link',
        security: [],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const parsed = ResendVerificationBodySchema.safeParse(b);
      if (!parsed.success) {
        return reply.code(400).send(toValidationFailure(parsed.error));
      }
      try {
        const res = await client.resendVerification(
          { email: parsed.data.email },
          buildMetadata(req)
        );
        return reply.send(AuthV1.ResendVerificationResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/forgot-password',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.forgotPassword },
      preHandler: emailRateLimit(b => b.email),
      schema: {
        tags: ['auth'],
        summary: 'Send a password reset link to the given email',
        security: [],
        body: {
          type: 'object',
          properties: {
            email: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const parsed = ForgotPasswordBodySchema.safeParse(b);
      if (!parsed.success) {
        return reply.code(400).send(toValidationFailure(parsed.error));
      }
      try {
        const res = await client.forgotPassword({ email: parsed.data.email }, buildMetadata(req));
        return reply.send(AuthV1.ForgotPasswordResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/reset-password',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.resetPassword },
      // reset-password carries no email — key the per-target cap on the reset
      // token instead, so a flood against one token (across IPs) is throttled.
      preHandler: emailRateLimit(b => b.resetToken ?? b.reset_token),
      schema: {
        tags: ['auth'],
        summary: 'Reset password using a reset token',
        security: [],
        body: {
          type: 'object',
          properties: {
            resetToken: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const parsed = ResetPasswordBodySchema.safeParse(normalizeResetPasswordBody(b));
      if (!parsed.success) {
        return reply.code(400).send(toValidationFailure(parsed.error));
      }
      try {
        const res = await client.resetPassword(
          {
            resetToken: parsed.data.resetToken,
            newPassword: parsed.data.newPassword,
          },
          buildMetadata(req)
        );
        return reply.send(AuthV1.ResetPasswordResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/redeem-invitation',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.redeemInvitation },
      // No email on this body either — key the per-target cap on the
      // invitation token, same reasoning as reset-password.
      preHandler: emailRateLimit(b => b.invitationToken ?? b.invitation_token),
      schema: {
        tags: ['auth'],
        summary: 'Redeem an admin-issued invitation token and set the initial password',
        security: [],
        body: {
          type: 'object',
          properties: {
            invitationToken: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string' },
                  userType: { type: 'string' },
                  status: { type: 'string' },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const parsed = RedeemInvitationBodySchema.safeParse(normalizeRedeemInvitationBody(b));
      if (!parsed.success) {
        return reply.code(400).send(toValidationFailure(parsed.error));
      }
      try {
        const res = await client.redeemInvitation(
          {
            invitationToken: parsed.data.invitationToken,
            newPassword: parsed.data.newPassword,
          },
          buildMetadata(req)
        );
        const json = AuthV1.RedeemInvitationResponse.toJSON(res) as Record<string, unknown>;
        return reply.send(withApiUser(json, res.user));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/change-password',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.changePassword },
      schema: {
        tags: ['auth'],
        summary: 'Change password for the authenticated user',
        body: {
          type: 'object',
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const parsed = ChangePasswordBodySchema.safeParse(normalizeChangePasswordBody(b));
      if (!parsed.success) {
        return reply.code(400).send(toValidationFailure(parsed.error));
      }
      try {
        const res = await client.changePassword(
          {
            currentPassword: parsed.data.currentPassword,
            newPassword: parsed.data.newPassword,
          },
          buildMetadata(req)
        );
        return reply.send(AuthV1.ChangePasswordResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // --- Two-factor (TOTP) enrolment -----------------------------------
  // Self-scoped: the authenticate middleware stamps the principal, and the
  // handlers act on that user's own account.

  app.post(
    '/api/v1/auth/2fa/setup',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.twoFactor },
      schema: {
        tags: ['auth'],
        summary: 'Initiate two-factor authentication setup for the authenticated user',
        response: {
          200: {
            type: 'object',
            properties: {
              secret: { type: 'string' },
              otpauthUrl: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.setupTwoFactor({}, buildMetadata(req));
        return reply.send(AuthV1.SetupTwoFactorResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/2fa/enable',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.twoFactor },
      schema: {
        tags: ['auth'],
        summary: 'Enable two-factor authentication using a verified TOTP secret',
        body: {
          type: 'object',
          properties: {
            secret: { type: 'string' },
            token: { type: 'string' },
          },
          required: ['secret', 'token'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              // 10 single-use backup/recovery codes (ADS-914b), returned in
              // plaintext exactly once — show these to the user now.
              backupCodes: { type: 'array', items: { type: 'string' } },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as { secret?: string; token?: string };
      try {
        const res = await client.enableTwoFactor(
          { secret: b.secret ?? '', token: b.token ?? '' },
          buildMetadata(req)
        );
        return reply.send(AuthV1.EnableTwoFactorResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/2fa/disable',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.twoFactor },
      schema: {
        tags: ['auth'],
        summary: 'Disable two-factor authentication for the authenticated user',
        body: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
          required: ['token'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as { token?: string };
      try {
        const res = await client.disableTwoFactor({ token: b.token ?? '' }, buildMetadata(req));
        return reply.send(AuthV1.DisableTwoFactorResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/auth/2fa/backup-codes/regenerate',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.twoFactor },
      schema: {
        tags: ['auth'],
        summary: 'Mint a fresh set of 2FA backup/recovery codes, invalidating the old ones',
        body: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
          required: ['token'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              // The fresh set of 10 plaintext backup codes, returned exactly
              // once — show these to the user now.
              backupCodes: { type: 'array', items: { type: 'string' } },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as { token?: string };
      try {
        const res = await client.regenerateBackupCodes(
          { token: b.token ?? '' },
          buildMetadata(req)
        );
        return reply.send(AuthV1.RegenerateBackupCodesResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.patch(
    '/api/v1/users/account',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.updateAccount },
      schema: {
        tags: ['auth'],
        summary: 'Update account profile fields for the authenticated user',
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  phoneNumber: { type: 'string' },
                  bio: { type: 'string' },
                  timezone: { type: 'string' },
                  language: { type: 'string' },
                  country: { type: 'string' },
                  city: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const parsed = UpdateAccountBodySchema.safeParse(normalizeUpdateAccountBody(b));
      if (!parsed.success) {
        return reply.code(400).send(toValidationFailure(parsed.error));
      }
      try {
        const res = await client.updateAccount(parsed.data, buildMetadata(req));
        const json = AuthV1.UpdateAccountResponse.toJSON(res) as Record<string, unknown>;
        return reply.send(withApiUser(json, res.user));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/users/account — alias for /auth/me.
  app.get(
    '/api/v1/users/account',
    {
      config: { rateLimit: AUTH_RATE_LIMITS.getMe },
      schema: {
        tags: ['auth'],
        summary: 'Return the authenticated user account profile',
        response: {
          200: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  userType: { type: 'string' },
                  status: { type: 'string' },
                  emailVerified: { type: 'boolean' },
                },
              },
              roles: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getMe({}, buildMetadata(req));
        const json = AuthV1.GetMeResponse.toJSON(res) as Record<string, unknown>;
        return reply.send({ ...withApiUser(json, res.user), roles: rolesToApi(res.roles ?? []) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

// Accept the canonical DB role string (`adopter`, `rescue_staff`, …)
// OR the SCREAMING proto form (`USER_ROLE_ADOPTER`). The handler's
// own INVALID_ARGUMENT guard fires when the value resolves to
// UNSPECIFIED, so an unknown role still produces the right 400.
function parseRole(raw: string | undefined): AuthV1.UserRole {
  if (!raw) {
    return AuthV1.UserRole.USER_ROLE_UNSPECIFIED;
  }
  const upper = `USER_ROLE_${raw.toUpperCase()}`;
  const candidate = Object.values(AuthV1.UserRole).includes(upper as never) ? upper : raw;
  const out = AuthV1.userRoleFromJSON(candidate);
  return out === AuthV1.UserRole.UNRECOGNIZED ? AuthV1.UserRole.USER_ROLE_UNSPECIFIED : out;
}
