// Typed stand-in for a full gRPC service implementation, for contract tests.
//
// Every RPC of the service answers UNIMPLEMENTED, so a test spreads its own
// handlers over this and only the RPCs under test do real work. Built from the
// service definition, so it always covers the whole generated surface and the
// result is typed as the generated `*ServiceServer` without a hand-kept list.

import { Metadata, type sendUnaryData, type ServiceError, status } from '@grpc/grpc-js';

const unimplementedError = (): ServiceError => {
  const err = new Error('not used') as ServiceError;
  err.code = status.UNIMPLEMENTED;
  err.details = 'not used';
  err.metadata = new Metadata();
  return err;
};

const unimplemented = (_call: unknown, cb: sendUnaryData<never>): void =>
  cb(unimplementedError(), null);

export const unimplementedHandlers = <Server extends object>(
  service: Record<keyof Server & string, unknown>,
  overrides: Partial<Server> = {}
): Server =>
  // Every key of the service definition becomes a handler; the generated Server
  // type has exactly those keys, which `service` is constrained to, but TS cannot
  // see that through Object.fromEntries (nor that spreading Partial<Server>, whose
  // index signature makes every member optional, still yields a full Server).
  ({
    ...Object.fromEntries(Object.keys(service).map(name => [name, unimplemented])),
    ...overrides,
  }) as Server;
