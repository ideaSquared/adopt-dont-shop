import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { Server as IOServer } from 'socket.io';
import type { Logger } from 'winston';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ValidateTokenResponse } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { SocketRegistry } from './socket-registry.js';
import { attachSocketServer, type AttachSocketServerOptions } from './socket-server.js';

function quietLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
  } as unknown as Logger;
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
  opts: Omit<AttachSocketServerOptions, 'httpServer' | 'registry'>
): Promise<Harness> {
  const httpServer = createServer();
  const registry = new SocketRegistry();
  const io = attachSocketServer({ httpServer, registry, ...opts });
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
});
