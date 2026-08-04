import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { NatsConnection } from 'nats';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { Server as IOServer } from 'socket.io';
import type { Logger } from 'winston';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMetricsRegistry } from '@adopt-dont-shop/observability';

import type { ValidateTokenResponse } from '@adopt-dont-shop/proto';

import type { GatewayConfig } from '../config.js';
import type { AuthClient } from '../grpc-clients/auth-client.js';

import { registerAuthSubscribers } from './auth-subscriber.js';
import { SocketRegistry } from './socket-registry.js';
import {
  attachSocketServer,
  createHandshakeRateLimiter,
  emitToUser,
  handshakeClientIp,
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
    // Default: a bare gateway that does NOT trust X-Forwarded-For (ADS-1021),
    // so the handshake limiter keys on the real socket address. Tests behind a
    // proxy override with trustProxy: true.
    trustProxy: false,
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

type AddedConsumer = { durable_name?: string; filter_subject?: string; deliver_policy?: string };

// JetStream stand-in for registerAuthSubscribers (ADS-1036), mirroring
// notifications-subscriber.test.ts / auth-subscriber.test.ts: subscribe()
// binds a durable consumer then drives consume(); the consume() iterator
// blocks on a per-filter-subject waiter queue so a test can `push` a message
// into a live subscriber on demand.
function makeNats(): {
  nats: NatsConnection;
  push: (subject: string, payload: unknown, id?: string) => Promise<void>;
} {
  const consumersAdded: AddedConsumer[] = [];
  const waiters = new Map<string, ((msg: { subject: string; data: Uint8Array }) => void)[]>();

  const jsm = {
    consumers: {
      add: vi.fn(async (_stream: string, cfg: AddedConsumer) => {
        consumersAdded.push(cfg);
        return cfg;
      }),
    },
  };

  const js = {
    consumers: {
      get: vi.fn(async (_stream: string, durable: string) => {
        const cfg = consumersAdded.find(c => c.durable_name === durable);
        const filter = cfg?.filter_subject ?? '';
        return {
          consume: vi.fn(async () => ({
            async *[Symbol.asyncIterator]() {
              for (;;) {
                const data = await new Promise<{ subject: string; data: Uint8Array }>(resolve => {
                  const list = waiters.get(filter) ?? [];
                  list.push(resolve);
                  waiters.set(filter, list);
                });
                yield { ...data, ack: vi.fn(), nak: vi.fn(), term: vi.fn(), redelivered: false };
              }
            },
            close: vi.fn(),
          })),
        };
      }),
    },
  };

  const nats = {
    jetstreamManager: vi.fn(async () => jsm),
    jetstream: vi.fn(() => js),
  } as unknown as NatsConnection;

  const push = async (subject: string, payload: unknown, id = 'evt-1'): Promise<void> => {
    const list = waiters.get(subject);
    const resolve = list?.shift();
    if (!resolve) {
      throw new Error(`no waiter on ${subject}`);
    }
    const envelope = { id, occurredAt: '2026-06-01T10:00:00Z', payload };
    resolve({ subject, data: new TextEncoder().encode(JSON.stringify(envelope)) });
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };

  return { nats, push };
}

// The consume loop is created in a fire-and-forget async task; give it a few
// microtasks to register its waiters before a test pushes a message.
async function settleNats(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setImmediate(r));
  }
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

describe('handshakeClientIp — trusted-proxy-aware keying (ADS-1021)', () => {
  const ADDR = '203.0.113.9';

  it('ignores X-Forwarded-For entirely on an untrusted (bare-gateway) peer', () => {
    // A directly-reachable gateway must not believe a client-supplied header —
    // otherwise the client rotates buckets to defeat the limiter.
    expect(handshakeClientIp({ 'x-forwarded-for': '1.1.1.1' }, ADDR, false)).toBe(ADDR);
    expect(handshakeClientIp({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }, ADDR, false)).toBe(ADDR);
  });

  it('falls back to the socket address when the header is absent', () => {
    expect(handshakeClientIp({}, ADDR, false)).toBe(ADDR);
    expect(handshakeClientIp({}, ADDR, true)).toBe(ADDR);
  });

  it('honours a single-entry X-Forwarded-For behind a trusted proxy', () => {
    expect(handshakeClientIp({ 'x-forwarded-for': '198.51.100.7' }, ADDR, true)).toBe(
      '198.51.100.7'
    );
  });

  it('takes the rightmost entry of a multi-entry X-Forwarded-For behind a trusted proxy', () => {
    // nginx appends the real peer as the last hop (ADS-915).
    expect(handshakeClientIp({ 'x-forwarded-for': '9.9.9.9, 198.51.100.7' }, ADDR, true)).toBe(
      '198.51.100.7'
    );
  });
});

describe('handshake rate limiting — XFF spoofing on an untrusted peer (ADS-1021)', () => {
  it('trips the limiter and increments the reject counter despite a rotating spoofed XFF', async () => {
    const rejectCounter = getMetricsRegistry().getSingleMetric(
      'gateway_ws_handshake_ratelimit_rejects_total'
    );
    const readRejects = async (): Promise<number> => {
      const snapshot = await rejectCounter?.get();
      return snapshot?.values[0]?.value ?? 0;
    };
    const before = await readRejects();

    // Untrusted peer (devConfig trustProxy:false); all three share the loopback
    // socket address, so distinct spoofed XFF values must NOT split the bucket.
    const { url } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(vi.fn().mockResolvedValue(VALID_RES)),
      handshakeRateLimit: { max: 2, windowMs: 60_000 },
    });

    const spoof = (v: string): ClientSocket => {
      const client = ioClient(url, {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: false,
        auth: { token: 'good.jwt' },
        extraHeaders: { 'X-Forwarded-For': v },
      });
      clients.push(client);
      return client;
    };

    expect(await awaitConnectOutcome(spoof('1.1.1.1'))).toBe(true);
    expect(await awaitConnectOutcome(spoof('2.2.2.2'))).toBe(true);
    expect(await awaitConnectOutcome(spoof('3.3.3.3'))).toBe(false);

    expect(await readRejects()).toBe(before + 1);
  });
});

describe('periodic revalidation (ADS-1036)', () => {
  it('disconnects the socket the first time a later revalidation call fails', async () => {
    const validateMock = vi
      .fn()
      .mockResolvedValueOnce(VALID_RES) // handshake
      .mockRejectedValueOnce(new Error('account is not active')); // first revalidation tick
    const { url } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
      revalidationInterval: { minMs: 20, maxMs: 20 },
    });

    const client = connectClient(url, { auth: { token: 'good.jwt' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    const disconnected = new Promise<string>(resolve => {
      client.on('disconnect', reason => resolve(reason));
    });

    await expect(disconnected).resolves.toBeTruthy();
    // Handshake validation + exactly one revalidation tick before eviction.
    expect(validateMock).toHaveBeenCalledTimes(2);
  });

  it('re-validates on the SAME token the handshake used', async () => {
    const validateMock = vi
      .fn()
      .mockResolvedValueOnce(VALID_RES)
      .mockRejectedValueOnce(new Error('expired'));
    const { url } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
      revalidationInterval: { minMs: 20, maxMs: 20 },
    });

    const client = connectClient(url, { auth: { token: 'reused.jwt' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    await new Promise<void>(resolve => client.on('disconnect', () => resolve()));

    for (const call of validateMock.mock.calls) {
      expect(call[0]).toEqual({ accessToken: 'reused.jwt' });
    }
  });

  it('keeps the socket connected while revalidation keeps succeeding', async () => {
    const validateMock = vi.fn().mockResolvedValue(VALID_RES);
    const { url, registry } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
      revalidationInterval: { minMs: 20, maxMs: 20 },
    });

    const client = connectClient(url, { auth: { token: 'good.jwt' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    // Long enough for several revalidation ticks at a 20ms interval.
    await new Promise(resolve => setTimeout(resolve, 90));

    expect(client.connected).toBe(true);
    expect(validateMock.mock.calls.length).toBeGreaterThan(2);
    expect(registry.socketsFor('usr-from-principal')).toHaveLength(1);
  });

  it('does not schedule revalidation in the dev-only allowUnauthenticated fallback (no token to revalidate)', async () => {
    const { url, registry } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
      revalidationInterval: { minMs: 10, maxMs: 10 },
    });

    const client = connectClient(url, { auth: { userId: 'usr-dev' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    // No authClient is wired at all in this mode, so if revalidation were
    // (incorrectly) scheduled it would throw trying to call validateToken
    // on undefined — surfaced as an unexpected disconnect.
    await new Promise(resolve => setTimeout(resolve, 40));

    expect(client.connected).toBe(true);
    expect(registry.socketsFor('usr-dev')).toHaveLength(1);
  });

  it('increments gateway_ws_revocation_disconnects_total{reason="revalidation_failed"}', async () => {
    // Re-fetch getSingleMetric() on every read rather than capturing it once
    // up front — attachSocketServer (via getRevocationDisconnectsCounter) is
    // what registers the metric, so a read taken before the first startServer
    // call in this file would see `undefined` and silently read 0 if this
    // test file were ever reordered to run this case first in isolation.
    const readReason = async (reason: string): Promise<number> => {
      const counter = getMetricsRegistry().getSingleMetric(
        'gateway_ws_revocation_disconnects_total'
      );
      const snapshot = await counter?.get();
      return snapshot?.values.find(v => v.labels.reason === reason)?.value ?? 0;
    };
    const before = await readReason('revalidation_failed');

    const validateMock = vi
      .fn()
      .mockResolvedValueOnce(VALID_RES)
      .mockRejectedValueOnce(new Error('revoked'));
    const { url } = await startServer({
      logger: quietLogger(),
      authClient: makeAuthClient(validateMock),
      revalidationInterval: { minMs: 20, maxMs: 20 },
    });

    const client = connectClient(url, { auth: { token: 'good.jwt' } });
    expect(await awaitConnectOutcome(client)).toBe(true);
    await new Promise<void>(resolve => client.on('disconnect', () => resolve()));

    expect(await readReason('revalidation_failed')).toBe(before + 1);
  });
});

describe('auth-driven session eviction (ADS-1036)', () => {
  it('disconnects the socket when auth.sessionRevoked fires for its user', async () => {
    const { url, io } = await startServer({ logger: quietLogger(), allowUnauthenticated: true });
    const client = connectClient(url, { auth: { userId: 'usr-revoke-self' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    const { nats, push } = makeNats();
    registerAuthSubscribers({ nats, io, logger: quietLogger() });
    await settleNats();

    const disconnected = new Promise<string>(resolve => {
      client.on('disconnect', reason => resolve(reason));
    });

    await push('auth.sessionRevoked', {
      sessionId: 'sess-1',
      familyId: 'fam-1',
      userId: 'usr-revoke-self',
    });

    await expect(disconnected).resolves.toBeTruthy();
  });

  it('disconnects the socket when auth.sessionRevokedByAdmin fires for its user', async () => {
    const { url, io } = await startServer({ logger: quietLogger(), allowUnauthenticated: true });
    const client = connectClient(url, { auth: { userId: 'usr-revoke-admin' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    const { nats, push } = makeNats();
    registerAuthSubscribers({ nats, io, logger: quietLogger() });
    await settleNats();

    const disconnected = new Promise<string>(resolve => {
      client.on('disconnect', reason => resolve(reason));
    });

    await push('auth.sessionRevokedByAdmin', {
      sessionId: 'sess-2',
      familyId: 'fam-2',
      userId: 'usr-revoke-admin',
      revokedBy: 'usr-admin',
    });

    await expect(disconnected).resolves.toBeTruthy();
  });

  it('disconnects the socket when auth.tokenRevoked fires for its user (logout)', async () => {
    const { url, io } = await startServer({ logger: quietLogger(), allowUnauthenticated: true });
    const client = connectClient(url, { auth: { userId: 'usr-logout' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    const { nats, push } = makeNats();
    registerAuthSubscribers({ nats, io, logger: quietLogger() });
    await settleNats();

    const disconnected = new Promise<string>(resolve => {
      client.on('disconnect', reason => resolve(reason));
    });

    await push('auth.tokenRevoked', {
      userId: 'usr-logout',
      jti: 'jti-1',
      tokenType: 'refresh',
    });

    await expect(disconnected).resolves.toBeTruthy();
  });

  it('does not disconnect a socket belonging to a different user', async () => {
    const { url, io, registry } = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
    });
    const client = connectClient(url, { auth: { userId: 'usr-innocent' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    const { nats, push } = makeNats();
    registerAuthSubscribers({ nats, io, logger: quietLogger() });
    await settleNats();

    await push('auth.sessionRevoked', {
      sessionId: 'sess-9',
      familyId: 'fam-9',
      userId: 'usr-someone-else',
    });

    // Give the (non-)eviction a moment to (not) happen.
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(client.connected).toBe(true);
    expect(registry.socketsFor('usr-innocent')).toHaveLength(1);
  });
});

describe('auth-driven session eviction — cross-replica (ADS-818 + ADS-1036)', () => {
  it('disconnects a socket connected on a DIFFERENT adapter-backed replica when its session is revoked', async () => {
    const bus = createInMemoryRedisBus();

    // Replica A: subscribes to the auth revocation stream and issues the
    // room-based eviction; no client connects here directly.
    const a = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
      redisAdapter: { pubClient: bus.client(), subClient: bus.client() },
    });

    // Replica B: the target user's socket actually lives here.
    const b = await startServer({
      logger: quietLogger(),
      allowUnauthenticated: true,
      redisAdapter: { pubClient: bus.client(), subClient: bus.client() },
    });

    const client = connectClient(b.url, { auth: { userId: 'usr-cross-revoke' } });
    expect(await awaitConnectOutcome(client)).toBe(true);

    const { nats, push } = makeNats();
    registerAuthSubscribers({ nats, io: a.io, logger: quietLogger() });
    await settleNats();

    const disconnected = new Promise<string>(resolve => {
      client.on('disconnect', reason => resolve(reason));
    });

    // Fires against replica A's subscriber; the eviction must reach the
    // socket on replica B via the Redis-adapter room, not A's (empty) local
    // registry.
    await push('auth.sessionRevoked', {
      sessionId: 'sess-cross',
      familyId: 'fam-cross',
      userId: 'usr-cross-revoke',
    });

    await expect(disconnected).resolves.toBeTruthy();
  });
});
