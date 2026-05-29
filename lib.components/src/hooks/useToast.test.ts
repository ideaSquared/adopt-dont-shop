import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows a toast and auto-hides it after the duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Hello', 'info', 3000);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]?.message).toBe('Hello');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('does not auto-hide when duration is 0', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Sticky', 'warning', 0);
    });

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.toasts).toHaveLength(1);
  });

  it('hideToast removes the specific toast immediately', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('A', 'info', 5000);
      result.current.showToast('B', 'info', 5000);
    });

    const idToRemove = result.current.toasts[0]?.id ?? '';

    act(() => {
      result.current.hideToast(idToRemove);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]?.message).toBe('B');
  });

  it('clearToasts removes all toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('X', 'success', 5000);
      result.current.showToast('Y', 'error', 5000);
    });

    act(() => {
      result.current.clearToasts();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('clears pending timers on unmount so no setState fires after unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Will be cancelled', 'info', 5000);
      result.current.showToast('Also cancelled', 'error', 8000);
    });

    expect(result.current.toasts).toHaveLength(2);

    unmount();

    // Both timers must have been cleared on unmount.
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

    // Advancing past the durations after unmount must not throw.
    expect(() => act(() => vi.advanceTimersByTime(10000))).not.toThrow();
  });
});
