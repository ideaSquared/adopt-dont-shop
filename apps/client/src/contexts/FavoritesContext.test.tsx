/**
 * Behavioural tests for FavoritesContext.
 *
 * Covers the adopter "save a pet" journey: loading favourites on login,
 * optimistic add/remove with rollback on failure, the logged-out guard rails,
 * and error surfacing/clearing. Exercises the context's public hook API plus
 * the shared BaseContext helpers (createAppContext guard, handleAsyncAction).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const getFavorites = vi.fn();
const addToFavorites = vi.fn();
const removeFromFavorites = vi.fn();

vi.mock('@/services', () => ({
  petService: {
    getFavorites: (...args: unknown[]) => getFavorites(...args),
    addToFavorites: (...args: unknown[]) => addToFavorites(...args),
    removeFromFavorites: (...args: unknown[]) => removeFromFavorites(...args),
  },
}));

let mockAuth = { isAuthenticated: true, user: { userId: 'u-1' } as { userId: string } | null };

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => mockAuth,
}));

import { FavoritesProvider, useFavorites } from './FavoritesContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <FavoritesProvider>{children}</FavoritesProvider>
);

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockAuth = { isAuthenticated: true, user: { userId: 'u-1' } };
  getFavorites.mockResolvedValue([]);
});

describe('loading favourites', () => {
  it('fetches the user favourites on mount when authenticated', async () => {
    getFavorites.mockResolvedValue([{ pet_id: 'pet-1' }, { pet_id: 'pet-2' }]);

    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => expect(result.current.isFavorite('pet-1')).toBe(true));
    expect(result.current.isFavorite('pet-2')).toBe(true);
    expect(result.current.isFavorite('pet-3')).toBe(false);
  });

  it('does not fetch and keeps favourites empty when logged out', async () => {
    mockAuth = { isAuthenticated: false, user: null };

    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => expect(result.current.favoritePetIds.size).toBe(0));
    expect(getFavorites).not.toHaveBeenCalled();
  });
});

describe('adding a favourite', () => {
  it('optimistically marks the pet as favourite and persists', async () => {
    addToFavorites.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(getFavorites).toHaveBeenCalled());

    await act(async () => {
      await result.current.addToFavorites('pet-9');
    });

    expect(addToFavorites).toHaveBeenCalledWith('pet-9');
    expect(result.current.isFavorite('pet-9')).toBe(true);
  });

  it('rolls back the optimistic update and throws when the request fails', async () => {
    addToFavorites.mockRejectedValue(new Error('server error'));
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(getFavorites).toHaveBeenCalled());

    await act(async () => {
      await expect(result.current.addToFavorites('pet-9')).rejects.toThrow(
        'Failed to add to favorites'
      );
    });

    expect(result.current.isFavorite('pet-9')).toBe(false);
  });

  it('keeps the pet favourited when the backend says it is already a favourite', async () => {
    addToFavorites.mockRejectedValue(new Error('Pet already in favorites'));
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(getFavorites).toHaveBeenCalled());

    await act(async () => {
      await result.current.addToFavorites('pet-9').catch(() => undefined);
    });

    expect(result.current.isFavorite('pet-9')).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('refuses to add when logged out', async () => {
    mockAuth = { isAuthenticated: false, user: null };
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await act(async () => {
      await expect(result.current.addToFavorites('pet-9')).rejects.toThrow(
        'Must be logged in to add favorites'
      );
    });
    expect(addToFavorites).not.toHaveBeenCalled();
  });
});

describe('removing a favourite', () => {
  it('optimistically removes the pet and persists', async () => {
    getFavorites.mockResolvedValue([{ pet_id: 'pet-1' }]);
    removeFromFavorites.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isFavorite('pet-1')).toBe(true));

    await act(async () => {
      await result.current.removeFromFavorites('pet-1');
    });

    expect(removeFromFavorites).toHaveBeenCalledWith('pet-1');
    expect(result.current.isFavorite('pet-1')).toBe(false);
  });

  it('restores the favourite and throws when removal fails', async () => {
    getFavorites.mockResolvedValue([{ pet_id: 'pet-1' }]);
    removeFromFavorites.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isFavorite('pet-1')).toBe(true));

    await act(async () => {
      await expect(result.current.removeFromFavorites('pet-1')).rejects.toThrow(
        'Failed to remove from favorites'
      );
    });

    expect(result.current.isFavorite('pet-1')).toBe(true);
  });

  it('is a no-op when the pet is not currently favourited', async () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(getFavorites).toHaveBeenCalled());

    await act(async () => {
      await result.current.removeFromFavorites('pet-unknown');
    });

    expect(removeFromFavorites).not.toHaveBeenCalled();
  });
});

describe('error handling', () => {
  it('clears a previously set error', async () => {
    getFavorites.mockRejectedValue(new Error('load failed'));
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => expect(result.current.error).toBe('load failed'));

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

describe('context guard', () => {
  it('throws when useFavorites is used outside the provider', () => {
    expect(() => renderHook(() => useFavorites())).toThrow(
      /must be used within a FavoritesProvider/
    );
  });
});
