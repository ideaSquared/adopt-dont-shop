import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { Server as IOServer } from 'socket.io';
import type { Logger } from 'winston';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ValidateTokenResponse } from '@adopt-dont-shop/proto';

import type { GatewayConfig } from '../config.js';
import type { AuthClient } from '../grpc-clients/auth-client.js';

import { SocketRegistry } from './socket-registry.js';
import {
  attachSocketServer,
  createHandshakeRateLimiter,
  emitToUser,
  type AttachSocketServerOptions,
  type RedisAdapterClient,
} from './socket-server.js';

function quietLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
  } as unknown as Logger;
}

// Minimal config slice the socket server reads (cors + environment). Tests
// that don't care about origin policy use this permissive dev default.
function devConfig(overrides?: Partial<GatewayConfig>): GatewayConfig {
  return {
    environment: 'development',
    cors: { origins: ['http://localhost:3000'] },
    ...overrides,
  } as GatewayConfig;
}

// In-memory stand-in for the gateway's Redis pub/sub, faithful to the subset
// of the ioredis surface the @socket.io/redis-adapter broadcast path uses:
//   - psubscribe(pattern) + on('pmessageBuffer', (pattern, channel, msg))
//   - subscribe([channels]) + on('messageBuffer', (channel, msg))
//   - publish(channel, msg) fans to matching pattern + exact subscribers on
//     EVERY client sharing the bus (modelling cross-replica Redis pub/sub).
// Lets two adapter-backed Socket.IO instances coordinate without a real Redis.
type PatternSub = { prefix: string };
type BusClient = RedisAdapterClient & {
  __patterns: PatternSub[];
  __channels: Set<string>;
  __emit: (event: string, ...args: unknown[]) => void;
};

function createInMemoryRedisBus(): { client: () => RedisAdapterClient } {
  const members: BusClient[] = [];

  const deliver = (channel: string, msg: string | Buffer): void => {
    const buf = typeof msg === 'string' ? Buffer.from(msg) : msg;
    for (const m of members) {
      for (const p of m.__patterns) {
        if (channel.startsWith(p.prefix)) {
          m.__emit('pmessageBuffer', `${p.prefix}*`, channel, buf);
        }
      }
      if (m.__channels.has(channel)) {
        m.__emit('messageBuffer', channel, buf);
      }
    }
  };

  const makeClient = (): RedisAdapterClient => {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const client: BusClient = {
      __patterns: [],
      __channels: new Set<string>(),
      __emit: (event, ...args) => {
        for (const fn of listeners.get(event) ?? []) {
          fn(...args);
        }
      },
      on(event, handler) {
        const list = listeners.get(event) ?? [];
        list.push(handler);
        listeners.set(event, list);
        return client;
      },
      psubscribe(pattern) {
        client.__patterns.push({ prefix: pattern.replace(/\*$/, '') });
        return Promise.resolve(1);
      },
      subscribe(channels) {
        for (const c of channels) {
          client.__channels.add(c);
        }
        return Promise.resolve(channels.length);
      },
      publish(channel, message) {
        deliver(channel, message);
        return Promise.resolve(members.length);
      },
    };
    members.push(client);
    return client;
  };

  return { client: makeClient };
}

// One-method auth client stub — mirrors authenticate.test.ts. The full
// AuthClient shape is huge; the socket server only depends on
// validateToken, so a narrow stub is the honest dependency.
function makeAuthClient(validateMock: ReturnType<typeof vi.fn>): AuthClient {
  return { validateToken: validateMock, close: vi.fn() } as unknown as AuthClient;
}

type Harness = {
  httpServer: HttpServer;
  io: IOServer;
  registry: SocketRegistry;
  url: string;
};

const harnesses: Harness[] = [];
const clients: ClientSocket[] = [];

async function startServer(
  opts: Omit<AttachSocketServerOptions, 'httpServer' | 'registry' | 'config'> &
    Partial<Pick<AttachSocketServerOptions, 'config'>>
): Promise<Harness> {
  const httpServer = createServer();
  const registry = new SocketRegistry();
  const io = attachSocketServer({ config: devConfig(), httpServer, registry, ...opts });
  await new Promise<void>(resolve => httpServer.listen(0, resolve));
  const port = (httpServer.address() as AddressInfo).port;
  const harness: Harness = { httpServer, io, registry, url: `http://127.0.0.1:${port}` };
  harnesses.push(harness);
  return harness;
}

function connectClient(url: string, handshake: { auth?: Record<string, unknown> }): ClientSocket {
  const client = ioClient(url, {
    path: '/socket.io',
    transports: ['websocket'],
    reconnection: false,
    ...handshake,
  });
  clients.push(client);
  return client;
}

// Resolves true if the client connects, false if it's rejected.
function awaitConnectOutcome(client: ClientSocket): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    client.on('connect', () => resolve(true));
    client.on('connect_error', () => resolve(false));
  });
}

const VALID_RES: ValidateTokenResponse = {
  principal: {
    userId: 'usr-from-principal',
    roles: [],
    permissions: [],
  },
  expiresAt: '2026-06-05T18:30:00Z',
};

beforeEach(() => {
  harnesses.length = 0;
  clients.length = 0;
});

afterEach(async () => {
  for (const client of clients) {
    client.disconnect();
  }
  for (const h of harnesses) {
    h.io.close();
    await new Promise<void>(resolve => h.httpServer.close(() => resolve()));
  }
});

describe('attachSocketServer — handshake authentication', () => {
  it('rejects a handshake with no token', async () => {
    const validateMock = vi.fn();
    const { url, registry } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
    });

    const client = connectClient(url, { auth: {} });
    const connected = await awaitConnectOutcome(client);

    expect(connected).toBe(false);
    expect(validateMock).not.toHaveBeenCalled();
    expect(registry.size()).toBe(0);
  });

  it('rejects a handshake whose token the auth service rejects', async () => {
    const validateMock = vi.fn().mockRejectedValue(new Error('invalid token'));
    const { url, registry } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
    });

    const client = connectClient(url, { auth: { token: 'bad.jwt' } });
    const connected = await awaitConnectOutcome(client);

    expect(connected).toBe(false);
    expect(validateMock).toHaveBeenCalledWith({ accessToken: 'bad.jwt' }, expect.anything());
    expect(registry.size()).toBe(0);
  });

  it('registers the socket under the principal userId, ignoring a forged client userId', async () => {
    const validateMock = vi.fn().mockResolvedValue(VALID_RES);
    const { url, registry } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
    });

    // The attacker passes BOTH a valid token AND a forged userId. The
    // server must register the principal's userId, never the forged one.
    const client = connectClient(url, {
      auth: { token: 'good.jwt', userId: 'usr-attacker' },
    });
    const connected = await awaitConnectOutcome(client);

    expect(connected).toBe(true);
    expect(validateMock).toHaveBeenCalledWith({ accessToken: 'good.jwt' }, expect.anything());
    expect(registry.socketsFor('usr-from-principal')).toHaveLength(1);
    expect(registry.socketsFor('usr-attacker')).toHaveLength(0);
  });

  it('rejects every handshake when no auth client is wired (fails closed)', async () => {
    const { url, registry } = await startServer({ logger: quietLogger() });

    const client = connectClient(url, { auth: { token: 'good.jwt' } });
    const connected = await awaitConnectOutcome(client);

    expect(connected).toBe(false);
    expect(registry.size()).toBe(0);
  });

  it('honours the explicit dev-only client-supplied-userId fallback', async () => {
    const { url, registry } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
    });

    const client = connectClient(url, { auth: { userId: 'usr-dev' } });
    const connected = await awaitConnectOutcome(client);

    expect(connected).toBe(true);
    expect(registry.socketsFor('usr-dev')).toHaveLength(1);
  });

  // ADS-919: the web frontend no longer sends handshake.auth.token — the
  // httpOnly accessToken cookie rides along on the upgrade request instead,
  // and this fallback (previously unreachable — nothing ever set the
  // cookie) is now the real path browser clients use.
  it('authenticates via the accessToken httpOnly cookie when handshake.auth carries no token', async () => {
    const validateMock = vi.fn().mockResolvedValue(VALID_RES);
    const { url, registry } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
    });

    const client = ioClient(url, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: { Cookie: 'accessToken=cookie.jwt' },
    });
    clients.push(client);
    const connected = await awaitConnectOutcome(client);

    expect(connected).toBe(true);
    expect(validateMock).toHaveBeenCalledWith({ accessToken: 'cookie.jwt' }, expect.anything());
    expect(registry.socketsFor('usr-from-principal')).toHaveLength(1);
  });

  it('prefers handshake.auth.token over the accessToken cookie when both are present', async () => {
    const validateMock = vi.fn().mockResolvedValue(VALID_RES);
    const { url } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
    });

    const client = ioClient(url, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      auth: { token: 'auth.jwt' },
      extraHeaders: { Cookie: 'accessToken=cookie.jwt' },
    });
    clients.push(client);
    await awaitConnectOutcome(client);

    expect(validateMock).toHaveBeenCalledWith({ accessToken: 'auth.jwt' }, expect.anything());
  });

  it('rejects a handshake whose accessToken cookie the auth service rejects', async () => {
    const validateMock = vi.fn().mockRejectedValue(new Error('invalid token'));
    const { url, registry } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
    });

    const client = ioClient(url, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: { Cookie: 'accessToken=bad.jwt' },
    });
    clients.push(client);
    const connected = await awaitConnectOutcome(client);

    expect(connected).toBe(false);
    expect(registry.size()).toBe(0);
  });
});

describe('attachSocketServer — origin allowlist (ADS-843)', () => {
  it('accepts a handshake from an allowed origin', async () => {
    const { url } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
      config: devConfig({ cors: { origins: ['http://allowed.example'] } }),
    });

    const client = ioClient(url, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      auth: { userId: 'usr-dev' },
      extraHeaders: { Origin: 'http://allowed.example' },
    });
    clients.push(client);
    expect(await awaitConnectOutcome(client)).toBe(true);
  });

  it('rejects a handshake from a disallowed origin', async () => {
    const { url } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
      config: devConfig({ cors: { origins: ['http://allowed.example'] } }),
    });

    const client = ioClient(url, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      auth: { userId: 'usr-dev' },
      extraHeaders: { Origin: 'http://evil.example' },
    });
    clients.push(client);
    expect(await awaitConnectOutcome(client)).toBe(false);
  });

  it('rejects every cross-origin handshake in production when no origins are configured (fails closed)', async () => {
    const { url } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
      config: devConfig({ environment: 'production', cors: { origins: [] } }),
    });

    const client = ioClient(url, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      auth: { userId: 'usr-dev' },
      extraHeaders: { Origin: 'http://anything.example' },
    });
    clients.push(client);
    expect(await awaitConnectOutcome(client)).toBe(false);
  });
});

describe('emitToUser — adapter-backed cross-instance fan-out (ADS-818)', () => {
  it('delivers an event to a user connected on a DIFFERENT adapter-backed instance', async () => {
    const bus = createInMemoryRedisBus();

    // Instance A: no client connected here — it only PUBLISHES.
    const a = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
      redisAdapter: { pubClient: bus.client(), subClient: bus.client() },
    });

    // Instance B: the target user's socket lives here.
    const b = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
      redisAdapter: { pubClient: bus.client(), subClient: bus.client() },
    });

    const client = connectClient(b.url, { auth: { userId: 'usr-cross' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    const received = new Promise<Record<string, unknown>>(resolve => {
      client.on('ping:cross', (payload: Record<string, unknown>) => resolve(payload));
    });

    // Emit from instance A — the adapter must route it over the shared bus
    // to instance B where the socket actually lives.
    emitToUser(a.io, 'usr-cross', 'ping:cross', { hello: 'world' });

    expect(await received).toEqual({ hello: 'world' });
  });
});

describe('maxHttpBufferSize (ADS-887)', () => {
  it('disconnects a client that sends a payload over the 64 KB cap', async () => {
    const { url } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
    });

    const client = connectClient(url, { auth: { userId: 'usr-oversized' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    const disconnected = new Promise<string>(resolve => {
      client.on('disconnect', reason => resolve(reason));
    });

    // One byte over the 64 KB cap set in attachSocketServer.
    client.emit('oversized', 'x'.repeat(64_001));

    await expect(disconnected).resolves.toBeTruthy();
  });

  it('accepts a payload comfortably under the cap', async () => {
    const { url, registry } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
    });

    const client = connectClient(url, { auth: { userId: 'usr-normal' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    // Give the server a moment to process the handshake into the registry,
    // then confirm the connection is still alive after a small message.
    client.emit('small', { hello: 'world' });
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(client.connected).toBe(true);
    expect(registry.socketsFor('usr-normal')).toHaveLength(1);
  });
});

describe('per-user connection cap (ADS-888)', () => {
  it('evicts the oldest socket when the same user opens an 11th connection', async () => {
    const { url, registry } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
    });

    const flood: ClientSocket[] = [];
    for (let i = 0; i < 10; i++) {
      const client = connectClient(url, { auth: { userId: 'usr-flood' } });
      expect(await awaitConnectOutcome(client)).toBe(true);
      flood.push(client);
    }
    expect(registry.socketsFor('usr-flood')).toHaveLength(10);

    const oldestDisconnected = new Promise<string>(resolve => {
      flood[0].on('disconnect', reason => resolve(reason));
    });

    const eleventh = connectClient(url, { auth: { userId: 'usr-flood' } });
    expect(await awaitConnectOutcome(eleventh)).toBe(true);

    await expect(oldestDisconnected).resolves.toBeTruthy();

    // Give the server a tick to process the evicted socket's disconnect
    // event and remove it from the registry.
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(registry.socketsFor('usr-flood')).toHaveLength(10);
  });

  it('does not evict sockets belonging to a DIFFERENT user', async () => {
    const { url, registry } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
    });

    for (let i = 0; i < 10; i++) {
      const client = connectClient(url, { auth: { userId: 'usr-a' } });
      expect(await awaitConnectOutcome(client)).toBe(true);
    }

    const other = connectClient(url, { auth: { userId: 'usr-b' } });
    expect(await awaitConnectOutcome(other)).toBe(true);

    expect(registry.socketsFor('usr-a')).toHaveLength(10);
    expect(registry.socketsFor('usr-b')).toHaveLength(1);
  });

  it('allows a user to hold up to (and including) the cap without eviction', async () => {
    const { url, registry } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
    });

    const flood: ClientSocket[] = [];
    for (let i = 0; i < 10; i++) {
      const client = connectClient(url, { auth: { userId: 'usr-at-cap' } });
      expect(await awaitConnectOutcome(client)).toBe(true);
      flood.push(client);
    }

    expect(flood.every(c => c.connected)).toBe(true);
    expect(registry.socketsFor('usr-at-cap')).toHaveLength(10);
  });
});

describe('createHandshakeRateLimiter (ADS-962)', () => {
  it('allows handshakes up to the cap within a window, then rejects', () => {
    const limiter = createHandshakeRateLimiter({ max: 3, windowMs: 1000, now: () => 0 });

    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(false);
  });

  it('meters each IP independently', () => {
    const limiter = createHandshakeRateLimiter({ max: 1, windowMs: 1000, now: () => 0 });

    expect(limiter.tryConsume('1.1.1.1')).toBe(true);
    expect(limiter.tryConsume('2.2.2.2')).toBe(true);
    expect(limiter.tryConsume('1.1.1.1')).toBe(false);
  });

  it('replenishes the allowance once the window rolls over', () => {
    let clock = 0;
    const limiter = createHandshakeRateLimiter({ max: 1, windowMs: 1000, now: () => clock });

    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(false);

    clock = 1000;
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
  });
});

describe('handshake rate limiting — pre-auth per-IP cap (ADS-962)', () => {
  it('rejects handshakes from one IP once the per-window cap is exceeded', async () => {
    const validateMock = vi.fn().mockResolvedValue(VALID_RES);
    const { url } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
      handshakeRateLimit: { max: 2, windowMs: 60_000 },
    });

    // All three clients share the loopback source IP, so they draw from the
    // same bucket. The first two are admitted; the third trips the cap.
    const first = connectClient(url, { auth: { token: 'good.jwt' } });
    expect(await awaitConnectOutcome(first)).toBe(true);
    const second = connectClient(url, { auth: { token: 'good.jwt' } });
    expect(await awaitConnectOutcome(second)).toBe(true);

    const third = connectClient(url, { auth: { token: 'good.jwt' } });
    expect(await awaitConnectOutcome(third)).toBe(false);
  });

  it('runs before token validation — a rate-limited handshake never hits the auth service', async () => {
    const validateMock = vi.fn().mockResolvedValue(VALID_RES);
    const { url } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
      handshakeRateLimit: { max: 2, windowMs: 60_000 },
    });

    const first = connectClient(url, { auth: { token: 'good.jwt' } });
    expect(await awaitConnectOutcome(first)).toBe(true);
    const second = connectClient(url, { auth: { token: 'good.jwt' } });
    expect(await awaitConnectOutcome(second)).toBe(true);
    const third = connectClient(url, { auth: { token: 'good.jwt' } });
    expect(await awaitConnectOutcome(third)).toBe(false);

    // The two admitted handshakes each validate their token; the rejected
    // third is short-circuited by the limiter before the auth round-trip.
    expect(validateMock).toHaveBeenCalledTimes(2);
  });
});
