// NATS / JetStream test doubles.
//
// Services communicate via NATS JetStream (`nats.jetstream().publish()`) and
// plain core NATS (`nats.publish()`). These doubles let tests assert what was
// published without requiring a live NATS server.
//
// `makeNatsDouble()` returns a lightweight fake that:
//   - Exposes a `publishSpy` — a Vitest `vi.fn()` recorded on every publish
//     call regardless of whether it went through core NATS or JetStream.
//   - Implements `jetstream()` returning an object whose `.publish()` routes
//     to the same spy (matching the pattern every service uses).
//   - Is structurally compatible with `NatsConnection` from the `nats` package
//     so it can be passed directly to service handler deps without a cast in
//     test code.
//   - The `published` array mirrors the spy calls as `NatsPublishCall` records
//     for tests that prefer the plain-array style over spy assertions.
//
// Usage with Vitest spy API:
//   const nat = makeNatsDouble();
//   // ...run handler...
//   expect(nat.publishSpy).toHaveBeenCalledWith('auth.login', expect.any(Uint8Array));
//   expect(nat.publishSpy.mock.calls[0][0]).toBe('auth.login');
//
// Usage with plain-array assertions:
//   expect(nat.published).toHaveLength(1);
//   expect(nat.published[0].subject).toBe('auth.login');

import { vi } from 'vitest';
import type { NatsConnection } from 'nats';

/**
 * A recorded NATS publish call.
 */
export type NatsPublishCall = {
  subject: string;
  data: Uint8Array | undefined;
};

/**
 * A NATS test double that records publish calls via a Vitest spy and
 * exposes them for assertion via both the spy API and a plain array.
 */
export type NatsDouble = {
  /**
   * The fake `NatsConnection` to inject into handler deps.
   * Structurally compatible so no cast is needed.
   */
  connection: NatsConnection;
  /**
   * Vitest spy recording every publish call (core NATS and JetStream both
   * route here). Compatible with `.mockImplementation()`, `.mock.calls`, etc.
   * Call signature: `(subject: string, data?: Uint8Array) => void`.
   */
  publishSpy: ReturnType<typeof vi.fn>;
  /**
   * All publish calls recorded in order. Each entry carries the subject and
   * optional data payload. Updated automatically as calls are made.
   */
  published: readonly NatsPublishCall[];
  /**
   * Clear the recorded publish calls and reset the spy (call in `beforeEach`
   * when reusing the double across tests).
   */
  clearPublished: () => void;
};

/**
 * Build a NATS test double.
 *
 * The returned `connection` can be injected directly as `HandlerDeps.nats`.
 * Both `connection.publish()` and `connection.jetstream().publish()` route to
 * the same Vitest spy, matching how services publish events.
 *
 * @example
 * const nat = makeNatsDouble();
 * const deps = { pool: poolDouble.pool, nats: nat.connection };
 * await myHandler(deps, principal, request);
 *
 * // Vitest spy API:
 * expect(nat.publishSpy).toHaveBeenCalledTimes(1);
 * const [subject] = nat.publishSpy.mock.calls[0];
 * expect(subject).toBe('auth.userRegistered');
 *
 * // Plain-array API:
 * expect(nat.published).toHaveLength(1);
 * expect(nat.published[0].subject).toBe('auth.userRegistered');
 */
export const makeNatsDouble = (): NatsDouble => {
  const records: NatsPublishCall[] = [];
  const publishSpy = vi.fn((subject: string, data?: Uint8Array): void => {
    records.push({ subject, data });
  });

  // Minimal structural implementation of what services call on NatsConnection.
  const connection = {
    publish: (subject: string, data?: Uint8Array) => publishSpy(subject, data),
    jetstream: () => ({
      publish: async (subject: string, data?: Uint8Array) => {
        publishSpy(subject, data);
        // Return a minimal PubAck-like object so callers that await publish don't crash.
        return { seq: 1, stream: 'stub', duplicate: false };
      },
    }),
    // Stub remaining NatsConnection methods that might be called during boot/shutdown.
    drain: async () => undefined,
    close: async () => undefined,
    status: () => ({ type: 'disconnect' }),
    closed: () => Promise.resolve(),
    isClosed: () => false,
    isDraining: () => false,
    getServer: () => 'nats://127.0.0.1:4222',
    flush: async () => undefined,
    subscribe: () => {
      throw new Error(
        'NatsDouble.subscribe() is not implemented — use makeNatsDouble only for publish assertions'
      );
    },
    jetstreamManager: async () => {
      throw new Error(
        'NatsDouble.jetstreamManager() is not implemented — use makeNatsDouble only for publish assertions'
      );
    },
    services: () => {
      throw new Error('NatsDouble.services() is not implemented');
    },
    info: undefined,
  } as unknown as NatsConnection;

  return {
    connection,
    publishSpy,
    get published() {
      return records as readonly NatsPublishCall[];
    },
    clearPublished: () => {
      records.length = 0;
      publishSpy.mockClear();
    },
  };
};
