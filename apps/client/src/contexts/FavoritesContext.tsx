import { petService } from '@/services';
import { FAVORITE_PET_IDS_QUERY_KEY, FAVORITE_PETS_QUERY_KEY } from '@/hooks/useFavoritePets';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { createAppContext, handleAsyncAction } from './base/BaseContext';

interface FavoritesContextType {
  favoritePetIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  isFavorite: (petId: string) => boolean;
  addToFavorites: (petId: string) => Promise<void>;
  removeFromFavorites: (petId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
  clearError: () => void;
}

const [FavoritesContext, useFavorites] = createAppContext<FavoritesContextType>('Favorites');

interface FavoritesProviderProps {
  children: React.ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const isSignedIn = isAuthenticated && !!user;

  const idsQuery = useQuery({
    queryKey: FAVORITE_PET_IDS_QUERY_KEY,
    queryFn: async () => (await petService.getFavorites()).map(pet => pet.pet_id),
    enabled: isSignedIn,
  });

  // Signing out must hide favourites even though the cache entry outlives the session.
  const favoritePetIds = useMemo(
    () => new Set(isSignedIn ? (idsQuery.data ?? []) : []),
    [isSignedIn, idsQuery.data]
  );
  const isLoading = idsQuery.isFetching;

  // Surface a failed load through the same `error` field the mutations use.
  useEffect(() => {
    if (idsQuery.error) {
      console.error('Failed to fetch favorites:', idsQuery.error);
      setError(idsQuery.error.message);
    }
  }, [idsQuery.error]);

  useEffect(() => {
    if (!isSignedIn) {
      queryClient.removeQueries({ queryKey: ['favorites'] });
    }
  }, [isSignedIn, queryClient]);

  const updateFavoriteIds = useCallback(
    (update: (ids: Set<string>) => Set<string>) => {
      queryClient.setQueryData<string[]>(FAVORITE_PET_IDS_QUERY_KEY, previous => [
        ...update(new Set(previous ?? [])),
      ]);
    },
    [queryClient]
  );

  const invalidateFavoritePets = useCallback(
    () => queryClient.invalidateQueries({ queryKey: FAVORITE_PETS_QUERY_KEY }),
    [queryClient]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isFavorite = useCallback(
    (petId: string): boolean => {
      return favoritePetIds.has(petId);
    },
    [favoritePetIds]
  );

  const refreshFavorites = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      return;
    }
    setError(null);
    await idsQuery.refetch();
  }, [isAuthenticated, idsQuery]);

  const addToFavorites = useCallback(
    async (petId: string): Promise<void> => {
      if (!isAuthenticated) {
        throw new Error('Must be logged in to add favorites');
      }

      if (favoritePetIds.has(petId)) {
        return; // Already in favorites
      }

      // Optimistic update
      updateFavoriteIds(prev => new Set([...prev, petId]));

      const success = await handleAsyncAction(() => petService.addToFavorites(petId), {
        setError,
        onSuccess: () => void invalidateFavoritePets(),
        onError: error => {
          console.error('Failed to add to favorites:', error);
          // Revert optimistic update on error
          updateFavoriteIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(petId);
            return newSet;
          });

          // Check for specific error that indicates already favorited
          const errorMessage = error.message || '';
          if (errorMessage.includes('already in favorites')) {
            // Backend says it's already favorited, keep in local state
            updateFavoriteIds(prev => new Set([...prev, petId]));
            setError(null); // Clear the error since it's not really an error
          }
        },
      });

      if (!success) {
        throw new Error('Failed to add to favorites');
      }
    },
    [isAuthenticated, favoritePetIds, updateFavoriteIds, invalidateFavoritePets]
  );

  const removeFromFavorites = useCallback(
    async (petId: string): Promise<void> => {
      if (!isAuthenticated) {
        throw new Error('Must be logged in to remove favorites');
      }

      if (!favoritePetIds.has(petId)) {
        return; // Not in favorites
      }

      // Optimistic update
      updateFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(petId);
        return newSet;
      });

      const success = await handleAsyncAction(() => petService.removeFromFavorites(petId), {
        setError,
        onSuccess: () => void invalidateFavoritePets(),
        onError: error => {
          console.error('Failed to remove from favorites:', error);
          // Revert optimistic update on error
          updateFavoriteIds(prev => new Set([...prev, petId]));
        },
      });

      if (!success) {
        throw new Error('Failed to remove from favorites');
      }
    },
    [isAuthenticated, favoritePetIds, updateFavoriteIds, invalidateFavoritePets]
  );

  const value: FavoritesContextType = {
    favoritePetIds,
    isLoading,
    error,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    refreshFavorites,
    clearError,
  };

  return <FavoritesContext value={value}>{children}</FavoritesContext>;
};

export { useFavorites };
export type { FavoritesContextType };
