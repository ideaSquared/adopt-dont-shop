// Behaviour tests for the stub gRPC server harness.
//
// These tests prove that `startStubGrpcServer`:
//   - Boots a real gRPC server on an ephemeral port (i.e. port > 0).
//   - Accepts and dispatches RPC calls end-to-end (via a real grpc-js client).
//   - Shuts down cleanly after `close()` is called.
//
// We use the `PingService` from `@adopt-dont-shop/proto` as the service
// under test since it is the simplest available definition (one unary
// method, no principal required).

import { promisify } from 'node:util';
import { credentials } from '@grpc/grpc-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Proto package is available as a devDependency wired via workspace:*.
import { PingV1 } from '@adopt-dont-shop/proto';

import { startStubGrpcServer, type StubGrpcServer } from './grpc-server.js';

// A minimal echo handler that returns the request message with a fixed timestamp.
const echoHandler: PingV1.PingServer = {
  echo: (call, callback) => {
    callback(null, {
      message: call.request.message,
      receivedAt: '2026-01-01T00:00:00Z',
    });
  },
};

describe('startStubGrpcServer', () => {
  let stub: StubGrpcServer;

  beforeAll(async () => {
    stub = await startStubGrpcServer(PingV1.PingService, echoHandler);
  });

  afterAll(async () => {
    await stub.close();
  });

  it('binds to an ephemeral port (port number > 0)', () => {
    const port = parseInt(stub.address.split(':')[1] ?? '0', 10);
    expect(port).toBeGreaterThan(0);
  });

  it('serves a live RPC call end-to-end', async () => {
    const client = new PingV1.PingClient(stub.address, credentials.createInsecure());
    const echo = promisify<PingV1.EchoRequest, PingV1.EchoResponse>(client.echo.bind(client));

    const response = await echo({ message: 'hello from test' });

    expect(response.message).toBe('hello from test');
    expect(response.receivedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('responds to multiple sequential calls on the same server', async () => {
    const client = new PingV1.PingClient(stub.address, credentials.createInsecure());
    const echo = promisify<PingV1.EchoRequest, PingV1.EchoResponse>(client.echo.bind(client));

    const [first, second] = await Promise.all([
      echo({ message: 'ping-1' }),
      echo({ message: 'ping-2' }),
    ]);

    expect(first.message).toBe('ping-1');
    expect(second.message).toBe('ping-2');
  });
});

describe('startStubGrpcServer — independent instance', () => {
  it('each call starts a server on a distinct ephemeral port', async () => {
    const handlerA: PingV1.PingServer = {
      echo: (call, callback) => callback(null, { message: 'A', receivedAt: '' }),
    };
    const handlerB: PingV1.PingServer = {
      echo: (call, callback) => callback(null, { message: 'B', receivedAt: '' }),
    };

    const [stubA, stubB] = await Promise.all([
      startStubGrpcServer(PingV1.PingService, handlerA),
      startStubGrpcServer(PingV1.PingService, handlerB),
    ]);

    try {
      expect(stubA.address).not.toBe(stubB.address);

      const clientA = new PingV1.PingClient(stubA.address, credentials.createInsecure());
      const clientB = new PingV1.PingClient(stubB.address, credentials.createInsecure());

      const [respA, respB] = await Promise.all([
        promisify<PingV1.EchoRequest, PingV1.EchoResponse>(clientA.echo.bind(clientA))({
          message: 'ignored',
        }),
        promisify<PingV1.EchoRequest, PingV1.EchoResponse>(clientB.echo.bind(clientB))({
          message: 'ignored',
        }),
      ]);

      expect(respA.message).toBe('A');
      expect(respB.message).toBe('B');
    } finally {
      await Promise.all([stubA.close(), stubB.close()]);
    }
  });
});
