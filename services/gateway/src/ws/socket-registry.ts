// Per-replica userId → Set<Socket> map. Tracks which Socket.IO
// connections belong to which user on THIS gateway replica.
//
// Multi-replica fan-out architecture (Phase 1.5):
//
//   - Each gateway replica subscribes to `notifications.*` on NATS
//     WITHOUT a queue group, so every replica receives every event.
//   - On an event, each replica looks up the recipient's sockets in
//     its own registry. The replica that holds the socket emits; the
//     other replicas no-op.
//   - Cost: event amplification (each event hits N replicas). Benefit:
//     no Redis-pub-sub-between-gateways glue is needed. For the
//     notification volume adopt-dont-shop expects, the trade-off is
//     correct. Revisit if event rate climbs.
//
// CAD's gateway uses an equivalent registry. Same name, same shape.

import type { Socket } from 'socket.io';

export class SocketRegistry {
  private readonly bucketsByUser = new Map<string, Set<Socket>>();

  add(userId: string, socket: Socket): void {
    const existing = this.bucketsByUser.get(userId);
    if (existing) {
      existing.add(socket);
      return;
    }
    this.bucketsByUser.set(userId, new Set([socket]));
  }

  remove(userId: string, socket: Socket): void {
    const bucket = this.bucketsByUser.get(userId);
    if (!bucket) {
      return;
    }
    bucket.delete(socket);
    if (bucket.size === 0) {
      this.bucketsByUser.delete(userId);
    }
  }

  // Returns a snapshot array so the caller can iterate safely even if
  // a socket disconnects mid-loop (which would mutate the underlying
  // Set).
  socketsFor(userId: string): Socket[] {
    const bucket = this.bucketsByUser.get(userId);
    if (!bucket) {
      return [];
    }
    return Array.from(bucket);
  }

  // For ops + smoke tests. Don't depend on this in production logic.
  size(): number {
    return this.bucketsByUser.size;
  }
}
