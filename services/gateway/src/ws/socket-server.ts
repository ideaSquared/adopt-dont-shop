// Socket.IO server attached to the gateway's underlying HTTP server.
//
// Auth: the WebSocket handshake is verified the same way the HTTP path
// is (services/gateway/src/middleware/authenticate.ts). An `io.use(...)`
// middleware pulls the access token off the handshake, calls
// `service.auth.ValidateToken`, and derives the socket's userId from the
// returned principal. The client-supplied userId is NEVER trusted — that
// was the Phase 1.5 dev mode and it was an IDOR over the whole realtime
// spine (anyone could connect claiming any userId and receive that
// user's notifications + chat).
//
// Token sources, in priority order:
//   1. `handshake.auth.token` — the Socket.IO idiomatic spot; the React
//      clients pass it here via `io(url, { auth: { token } })`.
//   2. The `accessToken` httpOnly cookie on the upgrade request
//      (`handshake.headers.cookie`) — what the web frontend relies on,
//      since the access token is not JS-readable and rides along
//      automatically on the WebSocket upgrade.
//
// Lifecycle:
//   - On handshake: verify the token, reject with `unauthorized` on a
//     missing/invalid token, otherwise stash the principal's userId on
//     `socket.data`.
//   - On connect: register the socket in the per-replica SocketRegistry.
//   - On disconnect: unregister.

import type { Server as HttpServer } from 'node:http';

import { Metadata } from '@grpc/grpc-js';
import { Server as IOServer, type Socket } from 'socket.io';
import type { Logger } from 'winston';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import type { SocketRegistry } from './socket-registry.js';

// Only the validateToken method is needed here — narrow the dependency so
// tests can supply a one-method stub, mirroring authenticate.ts.
type SocketAuthClient = Pick<AuthClient, 'validateToken'>;

export type AttachSocketServerOptions = {
  httpServer: HttpServer;
  registry: SocketRegistry;
  logger: Logger;
  // The auth gRPC client used to verify handshake tokens. Required in
  // production (wired in index.ts). Optional only so pure unit tests of
  // the registry/subscriber wiring don't have to stand one up.
  authClient?: SocketAuthClient;
  // Explicit, dangerous escape hatch: when no authClient is wired AND
  // this is true, fall back to trusting the client-supplied userId.
  // ONLY for local dev / tests — never set in production. When false
  // (the default) a missing authClient rejects every handshake, so a
  // misconfigured deploy fails closed instead of trusting clients.
  allowUnauthenticated?: boolean;
};

export const attachSocketServer = (opts: AttachSocketServerOptions): IOServer => {
  const { httpServer, registry, logger, authClient, allowUnauthenticated = false } = opts;

  const io = new IOServer(httpServer, {
    // Permissive CORS in dev — nginx is the real terminator in prod
    // and applies its own CSP / origin checks before any traffic
    // reaches this socket layer.
    cors: { origin: true, credentials: true },
    // The same /socket.io path the existing app uses, so the React
    // clients don't need to rebind during the strangler overlap.
    path: '/socket.io',
  });

  io.use((socket, next) => {
    void authenticateHandshake(socket, { authClient, allowUnauthenticated, logger })
      .then(userId => {
        if (!userId) {
          next(new Error('unauthorized'));
          return;
        }
        socket.data.userId = userId;
        next();
      })
      .catch(() => {
        next(new Error('unauthorized'));
      });
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    if (typeof userId !== 'string' || userId.length === 0) {
      // Should be unreachable — the io.use middleware rejects before
      // connection without a userId — but guard so a future contract
      // drift fails closed.
      logger.warn('socket connection rejected — missing authenticated userId', {
        socketId: socket.id,
      });
      socket.disconnect(true);
      return;
    }

    registry.add(userId, socket);
    logger.info('socket connected', {
      socketId: socket.id,
      userId,
      bucketSize: registry.socketsFor(userId).length,
    });

    socket.on('disconnect', reason => {
      registry.remove(userId, socket);
      logger.info('socket disconnected', { socketId: socket.id, userId, reason });
    });
  });

  return io;
};

type AuthenticateHandshakeDeps = {
  authClient?: SocketAuthClient;
  allowUnauthenticated: boolean;
  logger: Logger;
};

// Returns the authenticated userId, or undefined to reject the handshake.
async function authenticateHandshake(
  socket: Socket,
  deps: AuthenticateHandshakeDeps
): Promise<string | undefined> {
  const { authClient, allowUnauthenticated, logger } = deps;

  // No auth client wired. In production this never happens (index.ts
  // always passes one); when it does it's a misconfiguration and we fail
  // closed UNLESS the explicit dev/test escape hatch is set, in which
  // case we preserve the old client-supplied-userId behaviour.
  if (!authClient) {
    if (allowUnauthenticated) {
      return extractClientSuppliedUserId(socket);
    }
    logger.error('socket handshake rejected — no auth client configured');
    return undefined;
  }

  const token = extractToken(socket);
  if (!token) {
    return undefined;
  }

  try {
    const res = await authClient.validateToken({ accessToken: token }, new Metadata());
    const userId = res.principal?.userId;
    return typeof userId === 'string' && userId.length > 0 ? userId : undefined;
  } catch {
    // Invalid / expired / revoked token, or the auth service is down.
    // Either way the handshake is not trusted.
    return undefined;
  }
}

// Access token from the handshake. `auth.token` (Socket.IO idiomatic)
// takes priority; the `accessToken` httpOnly cookie on the upgrade
// request is the fallback the web frontend depends on.
function extractToken(socket: Socket): string | undefined {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth.length > 0) {
    return fromAuth;
  }
  return extractCookieToken(socket.handshake.headers.cookie);
}

// Parse the `accessToken` value out of a Cookie header. A plain split is
// O(n) and can't backtrack — same ReDoS-avoidance discipline as the HTTP
// bearer extractor.
function extractCookieToken(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith('accessToken=')) {
      const value = trimmed.slice('accessToken='.length);
      return value.length > 0 ? decodeURIComponent(value) : undefined;
    }
  }
  return undefined;
}

// Dev/test-only fallback: the pre-auth behaviour of trusting a
// client-supplied userId off the handshake. Reachable ONLY when no auth
// client is wired and allowUnauthenticated is explicitly true.
function extractClientSuppliedUserId(socket: Socket): string | undefined {
  const fromAuth = socket.handshake.auth?.userId;
  if (typeof fromAuth === 'string' && fromAuth.length > 0) {
    return fromAuth;
  }
  const fromQuery = socket.handshake.query?.userId;
  if (typeof fromQuery === 'string' && fromQuery.length > 0) {
    return fromQuery;
  }
  return undefined;
}
