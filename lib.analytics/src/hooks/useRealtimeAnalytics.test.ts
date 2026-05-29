import { resetRealtimeAnalytics, setRealtimeAnalyticsToken } from './useRealtimeAnalytics';

// Mock socket.io-client so tests don't open real WebSocket connections.
const mockSocket = {
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { io } from 'socket.io-client';
const mockIo = io as ReturnType<typeof vi.fn>;

afterEach(() => {
  resetRealtimeAnalytics();
  vi.clearAllMocks();
});

describe('resetRealtimeAnalytics', () => {
  it('disconnects an active socket and nulls the singleton', () => {
    setRealtimeAnalyticsToken('test-token');
    // A socket should have been created.
    expect(mockIo).toHaveBeenCalledTimes(1);

    resetRealtimeAnalytics();

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('calling reset without a prior token is a no-op (no error)', () => {
    expect(() => resetRealtimeAnalytics()).not.toThrow();
  });

  it('after reset, setting a new token creates a fresh socket', () => {
    setRealtimeAnalyticsToken('first-token');
    resetRealtimeAnalytics();
    vi.clearAllMocks();

    setRealtimeAnalyticsToken('second-token');

    // Should have created a brand-new socket for the new token.
    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(mockIo).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { token: 'second-token' } })
    );
  });

  it('setRealtimeAnalyticsToken(null) disconnects the socket and clears the pending token', () => {
    setRealtimeAnalyticsToken('token');
    vi.clearAllMocks();

    setRealtimeAnalyticsToken(null);

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    // No new socket should have been created for a null token.
    expect(mockIo).not.toHaveBeenCalled();
  });
});
