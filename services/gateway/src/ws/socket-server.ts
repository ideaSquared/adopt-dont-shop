// Socket.IO server attached to the gateway's underlying HTTP server.
//
// Auth (Phase 1.5 dev-mode): the client supplies `?userId=<id>` on the
// handshake query string. No real authentication — the gateway trusts
// the value. Phase 2 replaces this with token verification via
// service.auth.ValidateToken, after which the principal carried in
// gRPC metadata for HTTP requests will also drive socket identity.
//
// Lifecycle:
//   - On connect: extract userId, register the socket in the per-
//     replica SocketRegistry.
//   - On disconnect: unregister.
//   - On message from client: ignored for now (Phase 1.5 is server-
//     to-client only). Phase 6 (chat) adds typing indicators, presence,
//     and outbound messages from the client.

import type { Server as HttpServer } from 'node:http';

import { Server as IOServer, type Socket } from 'socket.io';
import type { Logger } from 'winston';

import type { SocketRegistry } from './socket-registry.js';

export type AttachSocketServerOptions = {
  httpServer: HttpServer;
  registry: SocketRegistry;
  logger: Logger;
};

export const attachSocketServer = (opts: AttachSocketServerOptions): IOServer => {
  const { httpServer, registry, logger } = opts;

  const io = new IOServer(httpServer, {
    // Permissive CORS in dev — nginx is the real terminator in prod
    // and applies its own CSP / origin checks before any traffic
    // reaches this socket layer.
    cors: { origin: true, credentials: true },
    // The same /socket.io path the existing app uses, so the React
    // clients don't need to rebind during the strangler overlap.
    path: '/socket.io',
  });

  io.on('connection', (socket: Socket) => {
    const userId = extractUserId(socket);
    if (!userId) {
      logger.warn('socket connection rejected — missing userId', {
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

// userId can land on either the handshake auth object (Socket.IO v3+
// preferred — `io({ auth: { userId } })`) or the query string (legacy
// clients). Accept both during the migration so we don't have to
// version-gate the connect call across all three React apps.
function extractUserId(socket: Socket): string | undefined {
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
