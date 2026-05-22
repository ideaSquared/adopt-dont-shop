/**
 * Behaviour test for the per-user Socket.IO connection cap. Without
 * the cap a single authenticated user can open hundreds of concurrent
 * WebSocket connections, limited only by the OS file-descriptor ceiling
 * — a trivial DoS. The cap is enforced by isUserAtConnectionCap, which
 * the socket auth middleware consults on every handshake.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_CONNECTIONS_PER_USER,
  __resetUserSocketRegistry,
  isUserAtConnectionCap,
  registerUserSocket,
  unregisterUserSocket,
} from './socket-registry';

describe('per-user Socket.IO connection cap', () => {
  beforeEach(() => {
    __resetUserSocketRegistry();
  });

  it('allows connections up to the cap', () => {
    for (let i = 0; i < MAX_CONNECTIONS_PER_USER; i++) {
      expect(isUserAtConnectionCap('user-1')).toBe(false);
      registerUserSocket('user-1', `socket-${i}`);
    }
  });

  it('reports at-cap once the user reaches the maximum', () => {
    for (let i = 0; i < MAX_CONNECTIONS_PER_USER; i++) {
      registerUserSocket('user-1', `socket-${i}`);
    }

    expect(isUserAtConnectionCap('user-1')).toBe(true);
  });

  it('rejects the 6th concurrent connection for the same user', () => {
    for (let i = 0; i < MAX_CONNECTIONS_PER_USER; i++) {
      registerUserSocket('user-1', `socket-${i}`);
    }

    // 6th would-be connection: gate returns at-cap, so the auth
    // middleware rejects the handshake without registering it.
    expect(isUserAtConnectionCap('user-1')).toBe(true);
  });

  it('keeps separate counts per user', () => {
    for (let i = 0; i < MAX_CONNECTIONS_PER_USER; i++) {
      registerUserSocket('user-1', `socket-${i}`);
    }

    expect(isUserAtConnectionCap('user-1')).toBe(true);
    expect(isUserAtConnectionCap('user-2')).toBe(false);
  });

  it('frees a slot when a socket disconnects', () => {
    for (let i = 0; i < MAX_CONNECTIONS_PER_USER; i++) {
      registerUserSocket('user-1', `socket-${i}`);
    }
    expect(isUserAtConnectionCap('user-1')).toBe(true);

    unregisterUserSocket('user-1', 'socket-0');

    expect(isUserAtConnectionCap('user-1')).toBe(false);
  });

  it('is idempotent for repeated register / unregister of the same id', () => {
    registerUserSocket('user-1', 'socket-a');
    registerUserSocket('user-1', 'socket-a');
    registerUserSocket('user-1', 'socket-a');

    // Still only one slot used.
    for (let i = 1; i < MAX_CONNECTIONS_PER_USER; i++) {
      registerUserSocket('user-1', `socket-${i}`);
    }
    expect(isUserAtConnectionCap('user-1')).toBe(true);

    unregisterUserSocket('user-1', 'socket-a');
    unregisterUserSocket('user-1', 'socket-a');
    expect(isUserAtConnectionCap('user-1')).toBe(false);
  });
});
