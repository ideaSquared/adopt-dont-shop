import { Client, credentials, Metadata, type ServiceError } from '@grpc/grpc-js';

import type { ServiceName } from './config.js';
import type { GrpcCaller } from './proto-methods.js';

// Generic unary caller over grpc-js: one lazily-created insecure channel per
// target service (traffic stays on the compose network), call shape taken from
// the resolved method, and the initial response metadata captured so the caller
// can verify the dry-run echo header.

export type ManagedGrpcCaller = { call: GrpcCaller; close: () => void };

export const createGrpcCaller = (
  targets: Readonly<Record<ServiceName, string>>
): ManagedGrpcCaller => {
  const clients = new Map<string, Client>();

  const clientFor = (service: string): Client => {
    const cached = clients.get(service);
    if (cached !== undefined) {
      return cached;
    }
    const address = Object.entries(targets).find(([name]) => name === service)?.[1];
    if (address === undefined) {
      throw new Error(`no gRPC target configured for service "${service}"`);
    }
    const client = new Client(address, credentials.createInsecure());
    clients.set(service, client);
    return client;
  };

  const call: GrpcCaller = ({ method, request, metadata, timeoutMs }) =>
    new Promise((resolve, reject) => {
      let initialMetadata = new Metadata();
      const unary = clientFor(method.service).makeUnaryRequest(
        method.grpcPath,
        method.serializeRequest,
        method.deserializeResponse,
        request,
        metadata,
        { deadline: Date.now() + timeoutMs },
        (err: ServiceError | null, response?: unknown) => {
          if (err !== null) {
            reject(err);
            return;
          }
          resolve({ response, responseMetadata: initialMetadata });
        }
      );
      unary.on('metadata', md => {
        initialMetadata = md;
      });
    });

  return { call, close: () => clients.forEach(client => client.close()) };
};
