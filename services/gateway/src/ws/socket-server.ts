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
// Origin allowlist (ADS-843): the handshake CORS check validates the
// request Origin against config.cors.origins (from CORS_ORIGIN) instead of
// the old `origin: true` wildcard. A cross-origin handshake from an
// unlisted origin is rejected. An empty allowlist fails closed (rejects
// every cross-origin handshake) — dev gets sensible localhost defaults from
// loadConfig() so this only bites a prod deploy that forgot CORS_ORIGIN.
//
// Multi-instance addressability (ADS-818): when a Redis pub/sub pair is
// supplied, Socket.IO binds @socket.io/redis-adapter. Each socket joins a
// room named after its userId, so emitToUser(io, userId, …) reaches that
// user on whichever replica they're connected to. NOTE: WebSocket upgrades
// behind a load balancer still need sticky sessions — the adapter
// coordinates message delivery across replicas, it does not relocate a live
// connection.
//
// Lifecycle:
//   - On handshake: validate the Origin, verify the token, reject with
//     `unauthorized` on a missing/invalid token, otherwise stash the
//     principal's userId on `socket.data`.
//   - On connect: register the socket in the per-replica SocketRegistry and
//     join the per-user room for adapter-backed addressing.
//   - On disconnect: unregister.

import type { Server as HttpServer } from 'node:http';

import { Metadata } from '@grpc/grpc-js';
import { getMetricsRegistry } from '@adopt-dont-shop/observability';
import { createAdapter } from '@socket.io/redis-adapter';
import { Counter } from 'prom-client';
import { Server as IOServer, type Socket } from 'socket.io';
import type { Logger } from 'winston';

import type { GatewayConfig } from '../config.js';
import type { AuthClient } from '../grpc-clients/auth-client.js';

import type { SocketRegistry } from './socket-registry.js';

// Only the validateToken method is needed here — narrow the dependency so
// tests can supply a one-method stub, mirroring authenticate.ts.
type SocketAuthClient = Pick<AuthClient, 'validateToken'>;

// Per-user connection cap (ADS-888). Bounds how many concurrent sockets one
// authenticated user can hold on THIS replica, closing an authenticated
// socket-flood DoS: without a cap, a single compromised credential can open
// unbounded connections, each holding a file descriptor, a Redis-adapter
// room subscription, and multiplying fan-out volume for that user. A
// legitimate user has at most a handful of tabs open; 10 is generous
// headroom. Per-replica only (the registry is in-process) — see the module
// comment on SocketRegistry for why a cross-replica Redis-backed cap isn't
// worth the added complexity here.
const MAX_SOCKETS_PER_USER = 10;

// Pre-auth per-IP handshake rate limit (ADS-962). nginx already caps
// /socket.io/ handshakes at the edge (deploy/gateway/nginx.conf, `socketio`
// zone: 2 r/s, burst 10), but the gateway can be reached directly (internal
// LB, a debug run without nginx), so this is defence-in-depth — the same
// posture as the origin allowlist and per-user cap in this file. It runs
// BEFORE the origin and auth checks so an unauthenticated flood is dropped
// before it costs a gRPC ValidateToken round-trip. Fixed window, in process
// (per replica) — consistent with the per-user cap's per-replica philosophy;
// nginx is the cross-instance layer. 30 per 10 s mirrors nginx's effective
// ceiling (2 r/s + burst 10) while leaving generous headroom for legitimate
// reconnect storms (multiple tabs re-handshaking after a network blip).
const MAX_HANDSHAKES_PER_WINDOW = 30;
const HANDSHAKE_WINDOW_MS = 10_000;

// Trip counter for the handshake rate limit, mirroring the sibling limiters'
// trip counters in server.ts (login, invitation-accept). Lazily created and
// registry-change-aware so repeated attachSocketServer/createServer calls in
// Vitest suites don't throw "metric already registered".
let _handshakeRejectEntry: { registryRef: object; counter: Counter } | null = null;

const getOrCreateHandshakeRejectCounter = (): Counter => {
  const reg = getMetricsRegistry();
  if (_handshakeRejectEntry && _handshakeRejectEntry.registryRef === reg) {
    return _handshakeRejectEntry.counter;
  }
  const counter = new Counter({
    name: 'gateway_ws_handshake_ratelimit_rejects_total',
    help: 'Total Socket.IO handshakes rejected by the per-IP pre-auth rate limit (ADS-962).',
    registers: [reg],
  });
  _handshakeRejectEntry = { registryRef: reg, counter };
  return counter;
};

export type HandshakeRateLimiter = { tryConsume: (ip: string) => boolean };

// Fixed-window per-IP handshake limiter (ADS-962). Pure and in-process; one
// instance lives per attachSocketServer call so there's no cross-replica or
// cross-test shared state. `now` is injectable for deterministic tests.
// Returns false once an IP has exhausted its allowance for the current window.
export const createHandshakeRateLimiter = (opts: {
  max: number;
  windowMs: number;
  now?: () => number;
}): HandshakeRateLimiter => {
  const { max, windowMs, now = Date.now } = opts;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  const tryConsume = (ip: string): boolean => {
    const t = now();
    const bucket = buckets.get(ip);
    if (!bucket || t >= bucket.resetAt) {
      // Opportunistic sweep keeps the map bounded by the IPs active within a
      // window, not all-time. A completed TCP+WS handshake means a real source
      // IP, so the working set is small — this is a safety net, not hot path.
      if (buckets.size > 10_000) {
        for (const [key, b] of buckets) {
          if (t >= b.resetAt) {
            buckets.delete(key);
          }
        }
      }
      buckets.set(ip, { count: 1, resetAt: t + windowMs });
      return true;
    }
    if (bucket.count >= max) {
      return false;
    }
    bucket.count += 1;
    return true;
  };

  return { tryConsume };
};

// The client IP for handshake rate-limit keying. nginx overwrites
// X-Forwarded-For with the real connecting IP ($remote_addr, ADS-915), so
// when the header is present the RIGHTMOST entry is the trustworthy hop —
// mirroring the HTTP path's trustProxy:1. A client-prepended XFF is discarded
// by nginx, and taking the rightmost entry also resists spoofing on a
// direct-to-gateway path. Falls back to the raw socket address when there's
// no proxy header (a direct connection).
const handshakeClientIp = (socket: Socket): string => {
  const xff = socket.handshake.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const last = xff.split(',').pop()?.trim();
    if (last) {
      return last;
    }
  }
  return socket.handshake.address;
};

// The slim Redis pub/sub surface the @socket.io/redis-adapter broadcast path
// uses. Parameters are intentionally widened (ioredis' publish/subscribe carry
// variadic + callback overloads) so both ioredis' Redis and a test double are
// structurally assignable without an `as` cast — createAdapter() itself accepts
// `any` for the clients, so this type is purely for our own call sites.
export type RedisAdapterClient = {
  publish: (...args: never[]) => unknown;
  subscribe: (...args: never[]) => unknown;
  psubscribe: (...args: never[]) => unknown;
  on: (...args: never[]) => unknown;
};

export type AttachSocketServerOptions = {
  httpServer: HttpServer;
  registry: SocketRegistry;
  logger: Logger;
  // Gateway config — the socket layer reads the CORS origin allowlist
  // (config.cors.origins) for its handshake origin policy (ADS-843). The
  // dev-vs-prod distinction lives in loadConfig(): dev gets localhost
  // defaults, prod must set CORS_ORIGIN or every cross-origin handshake is
  // rejected here.
  config: Pick<GatewayConfig, 'cors'>;
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
  // Redis pub/sub pair for the multi-instance adapter (ADS-818). When
  // supplied, Socket.IO binds @socket.io/redis-adapter so a broadcast to a
  // user's room (emitToUser) fans out across replicas — reaching whichever
  // replica that user is connected to. When omitted (single-replica dev /
  // tests) the server runs with the default in-process adapter.
  redisAdapter?: { pubClient: RedisAdapterClient; subClient: RedisAdapterClient };
  // Pre-auth handshake rate-limit tuning (ADS-962). Defaults to the module
  // constants; overridden in tests to exercise the rejection path without a
  // real flood. A per-IP fixed-window cap — see MAX_HANDSHAKES_PER_WINDOW.
  handshakeRateLimit?: { max: number; windowMs: number };
};

export const attachSocketServer = (opts: AttachSocketServerOptions): IOServer => {
  const { httpServer, registry, logger, config, authClient, allowUnauthenticated = false } = opts;

  const io = new IOServer(httpServer, {
    // Origin allowlist (ADS-843): the CORS layer is configured with the static
    // config.cors.origins allowlist — never a reflected wildcard — so a
    // credentialed handshake response can't echo an arbitrary origin. cors on
    // its own only omits the Access-Control-Allow-Origin header for an unlisted
    // origin (which a non-browser client ignores), so the HARD rejection lives
    // in the io.use handshake guard below. nginx applies its own origin check
    // at the edge, but the gateway can be hit directly (internal LB, debug runs
    // without nginx) so this is defence-in-depth.
    cors: {
      origin: config.cors.origins,
      credentials: true,
    },
    // The same /socket.io path the existing app uses, so the React
    // clients don't need to rebind during the strangler overlap.
    path: '/socket.io',
    // ADS-887: Socket.IO's default is 1 MB per message. Notification/chat
    // payloads are tiny (JSON + short text) — a large explicit cap bounds
    // the DoS surface (parse/dispatch CPU, in-flight buffer memory, and
    // Redis-adapter fan-out amplification across every replica) without
    // touching legitimate traffic. Large attachments go through the
    // existing upload/storage path and are referenced, not emitted inline.
    maxHttpBufferSize: 64_000, // 64 KB
  });

  // Multi-instance adapter (ADS-818). Binding the Redis adapter makes
  // io.to(room).emit() — and therefore emitToUser() — fan out across every
  // gateway replica via Redis pub/sub. NOTE on deployment: WebSocket
  // upgrades behind a load balancer need sticky sessions (or session-aware
  // routing) so a client's long-lived connection stays pinned to one
  // replica; the adapter coordinates DELIVERY across replicas but does not
  // move the live connection. Without the adapter the server uses the
  // default single-process in-memory adapter (fine for one replica / dev).
  if (opts.redisAdapter) {
    io.adapter(createAdapter(opts.redisAdapter.pubClient, opts.redisAdapter.subClient));
  }

  // Pre-auth per-IP handshake rate limit (ADS-962). Runs as the FIRST
  // handshake middleware — before the origin allowlist and token validation —
  // so a flood is rejected before it costs a gRPC ValidateToken round-trip.
  // State is scoped to this attachSocketServer call (fresh per replica / per
  // test), never module-global.
  const { max: handshakeMax, windowMs: handshakeWindowMs } = opts.handshakeRateLimit ?? {
    max: MAX_HANDSHAKES_PER_WINDOW,
    windowMs: HANDSHAKE_WINDOW_MS,
  };
  const handshakeLimiter = createHandshakeRateLimiter({
    max: handshakeMax,
    windowMs: handshakeWindowMs,
  });
  const handshakeRejectsTotal = getOrCreateHandshakeRejectCounter();

  io.use((socket, next) => {
    const ip = handshakeClientIp(socket);
    if (!handshakeLimiter.tryConsume(ip)) {
      handshakeRejectsTotal.inc();
      logger.warn('socket handshake rate limit exceeded', { ip });
      next(new Error('rate limit exceeded'));
      return;
    }
    next();
  });

  io.use((socket, next) => {
    // Origin allowlist (ADS-843). A browser always sends an Origin on the WS
    // upgrade — reject one that isn't in config.cors.origins so a cross-origin
    // page can't open an authenticated socket. A request without an Origin
    // (non-browser / same-origin) is not subject to this check. An empty
    // allowlist therefore rejects every cross-origin handshake (fail closed).
    const origin = socket.handshake.headers.origin;
    if (origin !== undefined && origin !== '' && !config.cors.origins.includes(origin)) {
      next(new Error('origin not allowed'));
      return;
    }

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

    // Per-user connection cap (ADS-888): evict the oldest socket before
    // registering this one so a legitimate reconnect after a network blip
    // doesn't get the NEW socket killed and leave the user stuck on a stale
    // one.
    const existing = registry.socketsFor(userId);
    if (existing.length >= MAX_SOCKETS_PER_USER) {
      existing[0]?.disconnect(true);
      logger.warn('socket cap exceeded — evicted oldest', {
        userId,
        cap: MAX_SOCKETS_PER_USER,
      });
    }

    registry.add(userId, socket);
    // Join a per-user room so the adapter can address this user across
    // replicas (ADS-818). Local fan-out still goes through the registry;
    // emitToUser() is the adapter-backed cross-replica primitive.
    void socket.join(userId);
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

// Emit an event to every socket belonging to a user, across ALL replicas
// when the Redis adapter is bound (ADS-818). Sockets join a room named after
// their userId on connect, so io.to(userId) addresses the user wherever they
// are connected. With the default in-process adapter this still works for the
// local replica.
export const emitToUser = (io: IOServer, userId: string, event: string, payload: unknown): void => {
  io.to(userId).emit(event, payload);
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
