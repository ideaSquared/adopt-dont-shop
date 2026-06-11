// Shared gRPC bind/shutdown wrapper.
//
// The caller builds a configured grpc.Server (with all services
// registered) and passes it here. startGrpcServer binds it on
// host:grpcPort and returns a RunningGrpcServer with a shutdown()
// helper that wraps tryShutdown in a Promise.

import { promisify } from 'node:util';

import { Server, ServerCredentials } from '@grpc/grpc-js';
import type { Logger } from 'winston';

export type GrpcServerConfig = {
  host: string;
  grpcPort: number;
};

export type RunningGrpcServer = {
  server: Server;
  port: number;
  shutdown: () => Promise<void>;
};

export const startGrpcServer = async (
  server: Server,
  config: GrpcServerConfig,
  logger: Logger
): Promise<RunningGrpcServer> => {
  const bindAsync = promisify<string, ServerCredentials, number>(server.bindAsync.bind(server));
  const port = await bindAsync(
    `${config.host}:${config.grpcPort}`,
    ServerCredentials.createInsecure()
  );

  logger.info('gRPC server listening', { port, host: config.host });

  return {
    server,
    port,
    shutdown: () =>
      new Promise<void>(resolve => {
        server.tryShutdown(err => {
          if (err) {
            logger.error('gRPC server shutdown error', { err });
          }
          resolve();
        });
      }),
  };
};
