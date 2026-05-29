import { useAuth } from '@adopt-dont-shop/lib.auth';
import { petService, Pet } from '@/services';
import { Alert, Container } from '@adopt-dont-shop/lib.components';
import { PetCardSkeletonGrid } from '@/components/skeletons';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PetCard } from '../components/PetCard';
import { useFavorites } from '../contexts/FavoritesContext';
import * as styles from './FavoritesPage.css';

export const FavoritesPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const favoritesContext = useFavorites();
  const [favorites, setFavorites] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchFavorites = async () => {
      if (!isAuthenticated) {
        if (!cancelled) {
          setLoading(false);
          setFavorites([]);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const favoritePets = await petService.getFavorites();
        if (!cancelled) {
          setFavorites(favoritePets);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch favorites:', err);
          setError('Failed to load your favorite pets. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchFavorites();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // ADS UX P0 #1: when an un-favorite API call fails, PetCard keeps the pet
  // in its internal state and surfaces the failure via FavoritesContext.error.
  // Mirror that here so the rendered list never drifts ahead of the server:
  // we only remove from local state on a successful toggle (handled below),
  // and we surface the context error so the user knows the toggle didn't
  // stick.
  useEffect(() => {
    if (favoritesContext.error) {
      setActionError(favoritesContext.error);
    }
  }, [favoritesContext.error]);

  const handleFavoriteToggle = async (petId: string, isFavorite: boolean) => {
    if (!isFavorite) {
      // PetCard only fires this callback after the remove API call has
      // resolved successfully, so removing from local state here is safe.
      // If the underlying call had failed, the callback would not fire and
      // the pet would stay in the list (with FavoritesContext.error
      // surfacing the failure via the effect above).
      setFavorites(prev => prev.filter(pet => pet.pet_id !== petId));
      setActionError(null);
    }
  };

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Container className={styles.pageContainer}>
        <div className={styles.loginPrompt}>
          <h2>Login Required</h2>
          <p>
            Please log in to view your favorite pets. Your favorites will be saved across all your
            devices.
          </p>
          <Link to='/login' className={styles.ctaButton}>
            Sign In to View Favorites
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className={styles.pageContainer}>
      <div className={styles.header}>
        <h1>Your Favorite Pets</h1>
        <p>
          Keep track of the pets that caught your heart. Your favorites are saved and synced across
          all your devices.
        </p>
      </div>

      {/* Show stats if user has favorites */}
      {!loading && favorites.length > 0 && (
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className='number'>{favorites.length}</div>
            <div className='label'>Favorite{favorites.length !== 1 ? 's' : ''}</div>
          </div>
          <div className={styles.statCard}>
            <div className='number'>
              {favorites.filter(pet => pet.status === 'available').length}
            </div>
            <div className='label'>Available</div>
          </div>
          <div className={styles.statCard}>
            <div className='number'>{new Set(favorites.map(pet => pet.type)).size}</div>
            <div className='label'>
              Pet Type{new Set(favorites.map(pet => pet.type)).size !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={styles.petGrid}>
          <PetCardSkeletonGrid count={6} />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant='error' className={styles.errorAlert}>
          {error}
        </Alert>
      )}

      {/* Action error (e.g. an un-favorite call failed) */}
      {actionError && !error && (
        <Alert variant='error' className={styles.errorAlert}>
          {actionError}
        </Alert>
      )}

      {/* Favorites grid */}
      {!loading && !error && favorites.length > 0 && (
        <div className={styles.petGrid}>
          {favorites.map(pet => (
            <PetCard
              key={pet.pet_id}
              pet={pet}
              showFavoriteButton={true}
              onFavoriteToggle={handleFavoriteToggle}
              isFavorite={true}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && favorites.length === 0 && (
        <div className={styles.emptyState}>
          <h2>No favorites yet</h2>
          <p>
            You haven&apos;t saved any pets to your favorites yet. Start exploring to find pets that
            steal your heart!
          </p>
          <div className={styles.ctaButtonRow}>
            <Link to='/discover' className={styles.ctaButton}>
              Start Swiping
            </Link>
            <Link to='/search' className={`${styles.ctaButton} ${styles.ctaButtonGreen}`}>
              Browse All Pets
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
};
