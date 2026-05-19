import { describe, it, expect, beforeEach, vi } from 'vitest';
import { disconnectAllSockets, setLiveIo, getLiveIo } from './socket-registry';

describe('socket-registry (ADS-597)', () => {
  beforeEach(() => {
    setLiveIo(null);
  });

  it('disconnectAllSockets is a no-op when no IO server is registered', () => {
    expect(() => disconnectAllSockets('user-1')).not.toThrow();
  });

  it('disconnectAllSockets targets the user:{id} room and calls disconnectSockets(true)', () => {
    const disconnectSockets = vi.fn();
    const to = vi.fn().mockReturnValue({ disconnectSockets });
    const fakeIo = { to } as unknown as Parameters<typeof setLiveIo>[0];
    setLiveIo(fakeIo);

    disconnectAllSockets('user-1');

    expect(to).toHaveBeenCalledWith('user:user-1');
    expect(disconnectSockets).toHaveBeenCalledWith(true);
  });

  it('getLiveIo returns the registered server', () => {
    const fakeIo = { to: () => ({}) } as unknown as Parameters<typeof setLiveIo>[0];
    setLiveIo(fakeIo);
    expect(getLiveIo()).toBe(fakeIo);
  });
});
