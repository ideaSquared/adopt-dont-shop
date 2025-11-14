import { useAuth } from '@adopt-dont-shop/lib.auth';
import { petService, Pet } from '@/services';
import { Alert, Container, Spinner } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { PetCard } from '../components/PetCard';

const PageContainer = styled(Container)`
  min-height: 100vh;
  padding: 2rem 0;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;

  h1 {
    font-size: 2.5rem;
    color: #333;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.1rem;
    color: #666;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const PetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: #f9f9f9;
  border-radius: 12px;
  margin: 2rem 0;

  .emoji {
    font-size: 4rem;
    margin-bottom: 1rem;
    display: block;
  }

  h2 {
    font-size: 1.8rem;
    color: #333;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.1rem;
    color: #666;
    margin-bottom: 2rem;
    line-height: 1.6;
  }
`;

const CTAButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #667eea;
  color: white;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: #5a67d8;
    transform: translateY(-1px);
  }
`;

const LoginPrompt = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: #f0f4f8;
  border-radius: 12px;
  margin: 2rem 0;

  h2 {
    font-size: 1.8rem;
    color: #333;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.1rem;
    color: #666;
    margin-bottom: 2rem;
    line-height: 1.6;
  }
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const StatCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  min-width: 120px;

  .number {
    font-size: 2rem;
    font-weight: bold;
    color: #667eea;
    margin-bottom: 0.5rem;
  }

  .label {
    font-size: 0.9rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const ErrorAlert = styled(Alert)`
  margin: 2rem 0;
`;

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
      <PageContainer>
        <LoginPrompt>
          <h2>🔐 Login Required</h2>
          <p>
            Please log in to view your favorite pets. Your favorites will be saved across all your
            devices.
          </p>
          <CTAButton to='/login'>Sign In to View Favorites</CTAButton>
        </LoginPrompt>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <h1>❤️ Your Favorite Pets</h1>
        <p>
          Keep track of the pets that caught your heart. Your favorites are saved and synced across
          all your devices.
        </p>
      </Header>

      {/* Show stats if user has favorites */}
      {!loading && favorites.length > 0 && (
        <StatsContainer>
          <StatCard>
            <div className='number'>{favorites.length}</div>
            <div className='label'>Favorite{favorites.length !== 1 ? 's' : ''}</div>
          </StatCard>
          <StatCard>
            <div className='number'>
              {favorites.filter(pet => pet.status === 'available').length}
            </div>
            <div className='label'>Available</div>
          </StatCard>
          <StatCard>
            <div className='number'>{new Set(favorites.map(pet => pet.type)).size}</div>
            <div className='label'>
              Pet Type{new Set(favorites.map(pet => pet.type)).size !== 1 ? 's' : ''}
            </div>
          </StatCard>
        </StatsContainer>
      )}

      {/* Loading state */}
      {loading && (
        <LoadingContainer>
          <Spinner size='lg' />
        </LoadingContainer>
      )}

      {/* Error state */}
      {error && <ErrorAlert variant='error'>{error}</ErrorAlert>}

      {/* Favorites grid */}
      {!loading && !error && favorites.length > 0 && (
        <PetGrid>
          {favorites.map(pet => (
            <PetCard
              key={pet.pet_id}
              pet={pet}
              showFavoriteButton={true}
              onFavoriteToggle={handleFavoriteToggle}
              isFavorite={true}
            />
          ))}
        </PetGrid>
      )}

      {/* Empty state */}
      {!loading && !error && favorites.length === 0 && (
        <EmptyState>
          <span className='emoji'>💔</span>
          <h2>No favorites yet</h2>
          <p>
            You haven&apos;t saved any pets to your favorites yet. Start exploring to find pets that
            steal your heart!
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <CTAButton to='/discover'>🔍 Start Swiping</CTAButton>
            <CTAButton to='/search' style={{ background: '#48bb78' }}>
              📋 Browse All Pets
            </CTAButton>
          </div>
        </EmptyState>
      )}
    </PageContainer>
  );
};
