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

/**
 * Maximum concurrent Socket.IO connections per authenticated user.
 * Covers multi-device + multi-tab usage (laptop + phone + a second
 * laptop = 3); the cap leaves headroom for occasional brief overlap
 * during reconnects. Without this cap a single authenticated user can
 * exhaust file descriptors via repeated open connections (DoS).
 */
export const MAX_CONNECTIONS_PER_USER = 5;

/**
 * Tracks active socket ids per authenticated user. Mutated by
 * registerUserSocket / unregisterUserSocket in the socket lifecycle.
 * Process-local: multi-instance deploys would need a Redis-backed
 * variant to enforce the cap across replicas (same caveat as the
 * presence map in socket-handlers).
 */
const userSocketIds = new Map<string, Set<string>>();

/**
 * Returns true when the user is already at or above the connection
 * cap. Callers should reject the incoming socket (disconnect + error
 * event) when this returns true.
 */
export function isUserAtConnectionCap(userId: string): boolean {
  const existing = userSocketIds.get(userId);
  return !!existing && existing.size >= MAX_CONNECTIONS_PER_USER;
}

/**
 * Record that `socketId` belongs to `userId`. Idempotent — re-
 * registering the same id is a no-op.
 */
export function registerUserSocket(userId: string, socketId: string): void {
  let ids = userSocketIds.get(userId);
  if (!ids) {
    ids = new Set();
    userSocketIds.set(userId, ids);
  }
  ids.add(socketId);
}

/**
 * Remove `socketId` from the user's active set. When the set becomes
 * empty the map entry is dropped so the cap state doesn't leak across
 * the user's reconnect cycles.
 */
export function unregisterUserSocket(userId: string, socketId: string): void {
  const ids = userSocketIds.get(userId);
  if (!ids) {
    return;
  }
  ids.delete(socketId);
  if (ids.size === 0) {
    userSocketIds.delete(userId);
  }
}

/**
 * Test-only helper to reset the registry between tests. Not exported
 * via index — call sites in production code should never need this.
 */
export function __resetUserSocketRegistry(): void {
  userSocketIds.clear();
}

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

/**
 * Notify every live socket belonging to `userId` that the user's role
 * (or other auth-cache-affecting state) changed on the server. Clients
 * should respond by re-fetching their session profile so cached role
 * checks (admin gates, ProtectedRoute, etc.) don't go stale until the
 * next page refresh.
 *
 * No-op when no IO server is registered — safe to call during cold
 * boot or in service tests that don't spin up the WebSocket transport.
 */
export function emitAuthRoleChanged(userId: string): void {
  if (!liveIo) {
    return;
  }
  liveIo.to(`user:${userId}`).emit('auth:role-changed', { at: new Date().toISOString() });
}
