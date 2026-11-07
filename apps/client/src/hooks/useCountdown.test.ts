import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle, not counting and not elapsed', () => {
    const { result } = renderHook(() => useCountdown());

    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.hasElapsed).toBe(false);
  });

  it('counts down one second at a time and then reports it has elapsed', () => {
    const { result } = renderHook(() => useCountdown());

    act(() => result.current.start(3));
    expect(result.current.secondsLeft).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsLeft).toBe(2);
    expect(result.current.hasElapsed).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.hasElapsed).toBe(true);
  });

  it('restarts from a new duration and clears hasElapsed', () => {
    const { result } = renderHook(() => useCountdown());
    act(() => result.current.start(1));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    act(() => result.current.start(5));

    expect(result.current.secondsLeft).toBe(5);
    expect(result.current.hasElapsed).toBe(false);
  });
});
