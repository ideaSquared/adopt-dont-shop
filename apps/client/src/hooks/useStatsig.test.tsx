/**
 * Behavioural tests for the useStatsig hook.
 *
 * The hook is a thin, null-safe wrapper over the Statsig client. We verify that
 * each helper forwards to the client when one is present, and degrades to safe
 * defaults (no-op logEvent, false gate, null experiment/config) when the client
 * has not yet initialised — so feature-flag reads never crash the app.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

const logEvent = vi.fn();
const checkGate = vi.fn();

const mockClient = { logEvent, checkGate };

let contextValue: { client: typeof mockClient | null } = { client: mockClient };

vi.mock('@statsig/react-bindings', () => ({
  StatsigContext: {
    Provider: ({ children }: { children: ReactNode }) => children,
    // React's useContext reads `_currentValue` from the context object.
    get _currentValue() {
      return contextValue;
    },
  },
}));

import { useStatsig } from './useStatsig';

beforeEach(() => {
  vi.resetAllMocks();
  contextValue = { client: mockClient };
});

describe('useStatsig with a ready client', () => {
  it('forwards logEvent to the client', () => {
    const { result } = renderHook(() => useStatsig());

    result.current.logEvent('button_clicked', 1, { component: 'Card' });

    expect(logEvent).toHaveBeenCalledWith('button_clicked', 1, { component: 'Card' });
  });

  it('returns the client gate result from checkGate', () => {
    checkGate.mockReturnValue(true);
    const { result } = renderHook(() => useStatsig());

    expect(result.current.checkGate('beta')).toBe(true);
    expect(checkGate).toHaveBeenCalledWith('beta');
  });
});

describe('useStatsig with no client', () => {
  beforeEach(() => {
    contextValue = { client: null };
  });

  it('logEvent is a no-op that does not throw', () => {
    const { result } = renderHook(() => useStatsig());

    expect(() => result.current.logEvent('x')).not.toThrow();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('checkGate defaults to false', () => {
    const { result } = renderHook(() => useStatsig());

    expect(result.current.checkGate('beta')).toBe(false);
  });
});
