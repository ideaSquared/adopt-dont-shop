// Stub gRPC server harness for in-process testing.
//
// `startStubGrpcServer` boots a real grpc.Server on an OS-assigned ephemeral
// port (host "127.0.0.1:0") so tests get a live gRPC transport without
// managing fixed ports. The returned `StubGrpcServer` value carries the
// bound address and a `close()` that shuts the server down cleanly.
//
// Typical usage pattern (Vitest):
//
//   let stub: StubGrpcServer;
//   beforeAll(async () => {
//     stub = await startStubGrpcServer(MyServiceDefinition, myHandlers);
//   });
//   afterAll(() => stub.close());
//
//   it('calls my RPC', async () => {
//     const client = new MyServiceClient(stub.address, grpc.credentials.createInsecure());
//     const resp = await promisify(client.myMethod.bind(client))({});
//     expect(resp.field).toBe('expected');
//   });

import { promisify } from 'node:util';
import {
  Server,
  ServerCredentials,
  type ServiceDefinition,
  type UntypedServiceImplementation,
} from '@grpc/grpc-js';

export type StubGrpcServer = {
  /** The bound address in `host:port` form, e.g. `127.0.0.1:54321`. */
  address: string;
  /** Shut the server down. Returns a Promise that resolves when teardown completes. */
  close: () => Promise<void>;
};

/**
 * Start an in-process gRPC stub server on an ephemeral port.
 *
 * @param definition - The grpc-js ServiceDefinition (from ts-proto or hand-rolled).
 * @param handlers   - The unary (and streaming) handler implementations.
 * @returns A `StubGrpcServer` with the bound `address` and a `close()` teardown.
 */
export const startStubGrpcServer = async (
  definition: ServiceDefinition,
  handlers: UntypedServiceImplementation
): Promise<StubGrpcServer> => {
  const server = new Server();
  server.addService(definition, handlers);

  const bindAsync = promisify<string, ServerCredentials, number>(server.bindAsync.bind(server));
  const port = await bindAsync('127.0.0.1:0', ServerCredentials.createInsecure());

  const address = `127.0.0.1:${port}`;

  const close = (): Promise<void> =>
    new Promise<void>(resolve => {
      server.tryShutdown(err => {
        if (err) {
          // Force-drain in case tryShutdown timed out.
          server.forceShutdown();
        }
        resolve();
      });
    });

  return { address, close };
};
