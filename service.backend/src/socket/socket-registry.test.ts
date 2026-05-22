import { describe, it, expect, beforeEach, vi } from 'vitest';
import { disconnectAllSockets, emitAuthRoleChanged, setLiveIo, getLiveIo } from './socket-registry';

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

  it('emitAuthRoleChanged is a no-op when no IO server is registered', () => {
    expect(() => emitAuthRoleChanged('user-1')).not.toThrow();
  });

  it('emitAuthRoleChanged broadcasts auth:role-changed to the user room', () => {
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    const fakeIo = { to } as unknown as Parameters<typeof setLiveIo>[0];
    setLiveIo(fakeIo);

    emitAuthRoleChanged('user-42');

    expect(to).toHaveBeenCalledWith('user:user-42');
    expect(emit).toHaveBeenCalledTimes(1);
    const [eventName, payload] = emit.mock.calls[0];
    expect(eventName).toBe('auth:role-changed');
    expect(typeof (payload as { at?: unknown }).at).toBe('string');
  });
});
