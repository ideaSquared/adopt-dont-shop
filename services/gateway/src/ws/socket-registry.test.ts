import { describe, expect, it } from 'vitest';
import type { Socket } from 'socket.io';

import { SocketRegistry } from './socket-registry.js';

// Sockets aren't materially used by the registry — it just holds them.
// Empty objects are enough to assert membership + identity.
function fakeSocket(): Socket {
  return {} as Socket;
}

describe('SocketRegistry', () => {
  it('returns an empty array for a user with no connected sockets', () => {
    const reg = new SocketRegistry();
    expect(reg.socketsFor('usr-1')).toEqual([]);
    expect(reg.size()).toBe(0);
  });

  it('stores a single socket under the user and returns it on lookup', () => {
    const reg = new SocketRegistry();
    const s = fakeSocket();
    reg.add('usr-1', s);

    expect(reg.socketsFor('usr-1')).toEqual([s]);
    expect(reg.size()).toBe(1);
  });

  it('supports multiple sockets per user (e.g. two browser tabs)', () => {
    const reg = new SocketRegistry();
    const s1 = fakeSocket();
    const s2 = fakeSocket();
    reg.add('usr-1', s1);
    reg.add('usr-1', s2);

    const sockets = reg.socketsFor('usr-1');
    expect(sockets).toHaveLength(2);
    expect(sockets).toContain(s1);
    expect(sockets).toContain(s2);
    expect(reg.size()).toBe(1);
  });

  it('removes a single socket without affecting siblings under the same user', () => {
    const reg = new SocketRegistry();
    const s1 = fakeSocket();
    const s2 = fakeSocket();
    reg.add('usr-1', s1);
    reg.add('usr-1', s2);

    reg.remove('usr-1', s1);

    expect(reg.socketsFor('usr-1')).toEqual([s2]);
    expect(reg.size()).toBe(1);
  });

  it('removes the user bucket entirely once the last socket disconnects', () => {
    const reg = new SocketRegistry();
    const s = fakeSocket();
    reg.add('usr-1', s);
    reg.remove('usr-1', s);

    expect(reg.socketsFor('usr-1')).toEqual([]);
    expect(reg.size()).toBe(0);
  });

  it('is a no-op when removing a socket the registry never saw', () => {
    const reg = new SocketRegistry();
    expect(() => reg.remove('usr-1', fakeSocket())).not.toThrow();
    expect(reg.size()).toBe(0);
  });

  it('returns a snapshot — mutating the returned array does not change the registry', () => {
    const reg = new SocketRegistry();
    const s = fakeSocket();
    reg.add('usr-1', s);

    const snapshot = reg.socketsFor('usr-1');
    snapshot.pop();

    expect(reg.socketsFor('usr-1')).toEqual([s]);
  });
});
