import type { Server as SocketIOServer } from 'socket.io';

/**
 * Tiny lifecycle registry for the live Socket.IO server. Lives in its
 * own module so service-layer callers (auth.service, admin.service)
 * can import disconnectAllSockets without pulling in the full
 * socket-handlers transitive graph (messageBroker, ChatService, etc).
 * That import cycle previously broke service tests where `crypto` is
 * mocked at module init time.
 *
 * SocketHandlers calls setLiveIo(io) at construction; helpers below no-
 * op until that runs, so they're safe to call during cold boot or in
 * tests that don't spin up the WebSocket transport.
 */

let liveIo: SocketIOServer | null = null;

export function setLiveIo(io: SocketIOServer | null): void {
  liveIo = io;
}

export function getLiveIo(): SocketIOServer | null {
  return liveIo;
}

/**
 * ADS-597: tear down every socket bound to `userId` immediately.
 * Wired into logout, account suspension, password reset, and 2FA
 * disable so a revoked auth state can't continue to receive events
 * over an open WebSocket.
 */
export function disconnectAllSockets(userId: string): void {
  if (!liveIo) {
    return;
  }
  liveIo.to(`user:${userId}`).disconnectSockets(true);
}
