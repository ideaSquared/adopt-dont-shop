// REST → gRPC translation for /api/auth/*.
//
// Phase 2.6 cutover: this Fastify plugin registers BEFORE the
// strangler-fig http-proxy catch-all, so Fastify's first-registered-
// wins prefix routing picks it for /api/auth/* requests before the
// catch-all sees them. Same shape as routes/notifications.ts.
//
// Route map (matches the monolith's existing /api/auth/* surface so
// the SPA + lib.auth React contexts don't have to change):
//
//   POST /api/auth/login           → AuthService.Login
//   POST /api/auth/logout          → AuthService.Logout
//   POST /api/auth/refresh-token   → AuthService.RefreshToken
//   GET  /api/auth/me              → AuthService.GetMe
//   POST /api/auth/assign-role     → AuthService.AssignRole  (admin-only)
//
// The authenticate middleware (Phase 2.5) already populates the
// x-user-* metadata headers for routes whose handler relies on the
// principal — Logout, GetMe, AssignRole. Login + RefreshToken don't
// need them (they mint a fresh principal); the middleware passes
// requests with no Authorization header through to the route.

import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  AuthV1,
  type AssignRoleRequest,
  type LoginRequest,
  type LogoutRequest,
  type RefreshTokenRequest,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';

export type AuthRoutesOptions = {
  client: AuthClient;
};

// Same gRPC-status → HTTP-status table the notifications routes use.
// UNAUTHENTICATED maps to 401 here so a wrong-password login returns
// 401, not 500.
const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.INTERNAL]: 500,
};

// Body shapes accepted by the REST surface. Kept narrow + explicit
// so a client typo doesn't get silently forwarded as `undefined` to
// the proto encoder, where it would land as the empty string.
type LoginBody = {
  email?: string;
  password?: string;
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

export const registerAuthRoutes = async (
  app: FastifyInstance,
  opts: AuthRoutesOptions
): Promise<void> => {
  const { client } = opts;

  app.post('/api/auth/login', async (req, reply) => {
    const body = (req.body ?? {}) as LoginBody;
    const grpcReq: LoginRequest = {
      email: body.email ?? '',
      password: body.password ?? '',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    try {
      const res = await client.login(grpcReq, buildMetadata(req));
      return reply.send(AuthV1.LoginResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const body = (req.body ?? {}) as LogoutBody;
    const grpcReq: LogoutRequest = { refreshToken: body.refreshToken ?? '' };

    try {
      const res = await client.logout(grpcReq, buildMetadata(req));
      return reply.send(AuthV1.LogoutResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.post('/api/auth/refresh-token', async (req, reply) => {
    const body = (req.body ?? {}) as RefreshTokenBody;
    const grpcReq: RefreshTokenRequest = { refreshToken: body.refreshToken ?? '' };

    try {
      const res = await client.refreshToken(grpcReq, buildMetadata(req));
      return reply.send(AuthV1.RefreshTokenResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.get('/api/auth/me', async (req, reply) => {
    try {
      const res = await client.getMe({}, buildMetadata(req));
      return reply.send(AuthV1.GetMeResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.post('/api/auth/assign-role', async (req, reply) => {
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
  });
};

// --- Helpers ---------------------------------------------------------

function buildMetadata(req: FastifyRequest): Metadata {
  const m = new Metadata();
  const headers = req.headers as Record<string, string | string[] | undefined>;
  // Same set the notifications routes forward — the authenticate
  // middleware already stripped any spoofs and (when there's a valid
  // Bearer) stamped the validated principal.
  for (const key of ['x-user-id', 'x-user-roles', 'x-user-permissions', 'x-rescue-id']) {
    const raw = headers[key];
    if (typeof raw === 'string' && raw.length > 0) {
      m.set(key, raw);
    }
  }
  return m;
}

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}

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
