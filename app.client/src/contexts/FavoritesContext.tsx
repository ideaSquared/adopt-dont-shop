import { petService } from '@/services';
import { Pet } from '@/services';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favoritePetIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  isFavorite: (petId: string) => boolean;
  addToFavorites: (petId: string) => Promise<void>;
  removeFromFavorites: (petId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

interface FavoritesProviderProps {
  children: React.ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favoritePetIds, setFavoritePetIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  const isFavorite = (petId: string): boolean => {
    return favoritePetIds.has(petId);
  };

  const refreshFavorites = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setFavoritePetIds(new Set());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const favorites: Pet[] = await petService.getFavorites();
      const petIds = new Set(favorites.map(pet => pet.pet_id));
      setFavoritePetIds(petIds);
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch favorites');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const addToFavorites = async (petId: string): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Must be logged in to add favorites');
    }

    if (favoritePetIds.has(petId)) {
      // Already in favorites, don't make the API call
      return;
    }

    try {
      await petService.addToFavorites(petId);
      setFavoritePetIds(prev => new Set([...prev, petId]));
    } catch (err) {
      console.error('Failed to add to favorites:', err);

      // Check for specific error that indicates the pet is already favorited
      const errorMessage = (err as Error)?.message || '';
      if (errorMessage.includes('already in favorites')) {
        // Backend says it's already favorited, sync our local state
        setFavoritePetIds(prev => new Set([...prev, petId]));
        return; // Don't throw error for this case
      }

      throw err;
    }
  };

  const removeFromFavorites = async (petId: string): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Must be logged in to remove favorites');
    }

    if (!favoritePetIds.has(petId)) {
      // Not in favorites, don't make the API call
      return;
    }

    try {
      await petService.removeFromFavorites(petId);
      setFavoritePetIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(petId);
        return newSet;
      });
    } catch (err) {
      console.error('Failed to remove from favorites:', err);
      throw err;
    }
  };

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
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};
