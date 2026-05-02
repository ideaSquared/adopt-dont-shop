import { useAuth } from '@adopt-dont-shop/lib.auth';
import { petService, Pet } from '@/services';
import { Alert, Container, Spinner } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PetCard } from '../components/PetCard';
import * as styles from './FavoritesPage.css';

export const FavoritesPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        setFavorites([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const favoritePets = await petService.getFavorites();
        setFavorites(favoritePets);
      } catch (err) {
        console.error('Failed to fetch favorites:', err);
        setError('Failed to load your favorite pets. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated]);

  const handleFavoriteToggle = async (petId: string, isFavorite: boolean) => {
    if (!isFavorite) {
      // Pet was removed from favorites, update the list
      setFavorites(prev => prev.filter(pet => pet.pet_id !== petId));
    }
  };

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Container className={styles.pageContainer}>
        <div className={styles.loginPrompt}>
          <h2>🔐 Login Required</h2>
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
        <h1>❤️ Your Favorite Pets</h1>
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
        <div className={styles.loadingContainer}>
          <Spinner size='lg' />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant='error' className={styles.errorAlert}>
          {error}
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
          <span className='emoji'>💔</span>
          <h2>No favorites yet</h2>
          <p>
            You haven&apos;t saved any pets to your favorites yet. Start exploring to find pets that
            steal your heart!
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to='/discover' className={styles.ctaButton}>
              🔍 Start Swiping
            </Link>
            <Link to='/search' className={styles.ctaButton} style={{ background: '#48bb78' }}>
              📋 Browse All Pets
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
};
