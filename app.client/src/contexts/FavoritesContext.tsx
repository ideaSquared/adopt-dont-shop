import { petService } from '@/services';
import { Pet } from '@/services';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import { createAppContext } from './base/BaseContext';

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
  const [favoritePetIds, setFavoritePetIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

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
      setFavoritePetIds(new Set());
      return;
    }

    const result = await handleAsyncAction(() => petService.getFavorites(), {
      setLoading: setIsLoading,
      setError,
      onError: error => console.error('Failed to fetch favorites:', error),
    });

    if (result) {
      const petIds = new Set(result.map(pet => pet.pet_id));
      setFavoritePetIds(petIds);
    }
  }, [isAuthenticated]);

  const addToFavorites = useCallback(
    async (petId: string): Promise<void> => {
      if (!isAuthenticated) {
        throw new Error('Must be logged in to add favorites');
      }

      if (favoritePetIds.has(petId)) {
        return; // Already in favorites
      }

      // Optimistic update
      setFavoritePetIds(prev => new Set([...prev, petId]));

      const success = await handleAsyncAction(() => petService.addToFavorites(petId), {
        setError,
        onError: error => {
          console.error('Failed to add to favorites:', error);
          // Revert optimistic update on error
          setFavoritePetIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(petId);
            return newSet;
          });

          // Check for specific error that indicates already favorited
          const errorMessage = error.message || '';
          if (errorMessage.includes('already in favorites')) {
            // Backend says it's already favorited, keep in local state
            setFavoritePetIds(prev => new Set([...prev, petId]));
            setError(null); // Clear the error since it's not really an error
          }
        },
      });

      if (!success) {
        throw new Error('Failed to add to favorites');
      }
    },
    [isAuthenticated, favoritePetIds]
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
      setFavoritePetIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(petId);
        return newSet;
      });

      const success = await handleAsyncAction(() => petService.removeFromFavorites(petId), {
        setError,
        onError: error => {
          console.error('Failed to remove from favorites:', error);
          // Revert optimistic update on error
          setFavoritePetIds(prev => new Set([...prev, petId]));
        },
      });

      if (!success) {
        throw new Error('Failed to remove from favorites');
      }
    },
    [isAuthenticated, favoritePetIds]
  );

  // Fetch favorites when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshFavorites();
    } else {
      setFavoritePetIds(new Set());
    }
  }, [isAuthenticated, user, refreshFavorites]);

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

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export { useFavorites };
export type { FavoritesContextType };
export default FavoritesContext;
