import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ChatService } from '../../services/chat-service';
import { useConnectionStatus } from '../use-connection-status';

vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    id: 'mock-socket-id',
  };
  return { io: vi.fn(() => mockSocket) };
});

describe('useConnectionStatus', () => {
  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService({ debug: false });
  });

  afterEach(() => {
    service.disconnect();
  });

  it('starts in the disconnected state with no reconnection attempts', () => {
    const { result } = renderHook(() => useConnectionStatus(service));

    expect(result.current.status).toBe('disconnected');
    expect(result.current.isDisconnected).toBe(true);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.reconnectionAttempts).toBe(0);
  });

  it('reflects a connected status after the socket connects', () => {
    const { result } = renderHook(() => useConnectionStatus(service));

    act(() => {
      service.connect('user-1', 'token');
      service.simulateConnectEvent();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isDisconnected).toBe(false);
  });

  it('reports reconnecting state and surfaces the running attempt count after repeated drops', () => {
    const { result } = renderHook(() => useConnectionStatus(service));

    act(() => {
      service.connect('user-1', 'token');
      service.simulateConnectEvent();
      // Each server-initiated drop schedules a reconnection. The attempt
      // counter is read by the status listener and increments per cycle, so a
      // second drop surfaces a non-zero count through the hook.
      service.simulateDisconnect();
      service.simulateDisconnect();
    });

    expect(result.current.isReconnecting).toBe(true);
    expect(result.current.reconnectionAttempts).toBeGreaterThanOrEqual(1);
  });

  it('stops listening after unmount so later status changes are ignored', () => {
    const offSpy = vi.spyOn(service, 'offConnectionStatusChange');
    const { unmount } = renderHook(() => useConnectionStatus(service));

    unmount();

    expect(offSpy).toHaveBeenCalled();
  });
});
