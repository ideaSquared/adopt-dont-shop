/**
 * Behavioral tests for useApplicationDraft hook.
 *
 * Covers:
 * - Flushing a pending debounced save to the server on unmount so
 *   the user's last edit is not silently dropped.
 * - Cancelling the debounce timer on unmount (no double-save).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApplicationDraft } from './useApplicationDraft';

const apiGet = vi.fn();
const apiPut = vi.fn();
const apiDelete = vi.fn();

vi.mock('@/services', () => ({
  apiService: {
    get: (...args: unknown[]) => apiGet(...args),
    put: (...args: unknown[]) => apiPut(...args),
    delete: (...args: unknown[]) => apiDelete(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Default GET: 404 (no existing draft)
  apiGet.mockRejectedValue({ status: 404 });
  apiPut.mockResolvedValue({ data: { updatedAt: new Date().toISOString() } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useApplicationDraft – flush pending save on unmount', () => {
  it('fires a PUT to the server when unmounted with a pending debounced save', async () => {
    const { result, unmount } = renderHook(() => useApplicationDraft('pet-123'));

    // Schedule a save (debounce hasn't fired yet)
    act(() => {
      result.current.scheduleSave({ question1: 'answer' });
    });

    // Debounce timer still pending — confirm PUT not yet called
    expect(apiPut).not.toHaveBeenCalled();

    // Unmount before the debounce fires
    unmount();

    // The hook should have flushed the pending save on unmount
    expect(apiPut).toHaveBeenCalledTimes(1);
    expect(apiPut).toHaveBeenCalledWith('/api/v1/applications/drafts/pet-123', {
      answers: { question1: 'answer' },
    });
  });

  it('does NOT fire a PUT on unmount when there is no pending debounced save', async () => {
    const { unmount } = renderHook(() => useApplicationDraft('pet-123'));

    unmount();

    expect(apiPut).not.toHaveBeenCalled();
  });

  it('does NOT fire a double PUT when debounce fires and then component unmounts', async () => {
    const { result, unmount } = renderHook(() => useApplicationDraft('pet-123'));

    act(() => {
      result.current.scheduleSave({ question1: 'answer' });
    });

    // Let the debounce fire normally
    await act(async () => {
      vi.runAllTimers();
    });

    // PUT was already made by the debounce
    expect(apiPut).toHaveBeenCalledTimes(1);

    // Unmount — no second PUT should be issued
    unmount();

    expect(apiPut).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire a PUT on unmount when petId is undefined', () => {
    const { result, unmount } = renderHook(() => useApplicationDraft(undefined));

    act(() => {
      // scheduleSave is a no-op when petId is undefined, so nothing is pending
      result.current.scheduleSave({ q: 'a' });
    });

    unmount();

    expect(apiPut).not.toHaveBeenCalled();
  });
});
