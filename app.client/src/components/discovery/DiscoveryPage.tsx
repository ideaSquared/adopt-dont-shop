import { DiscoveryPet, PetSearchFilters, SwipeAction, SwipeSession } from '@/types';
import { Container } from '@adopt-dont-shop/components';
import React, { useCallback, useEffect, useState } from 'react';
import { MdWarning } from 'react-icons/md';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { discoveryService } from '../../services/discoveryService';
import { SwipeControls } from '../swipe/SwipeControls';
import { SwipeStack } from '../swipe/SwipeStack';

const PageContainer = styled(Container)`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 0 1rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const FilterButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  background: #f8f9fa;
  color: #333;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #e9ecef;
  }

  &.active {
    background: #4ecdc4;
    color: white;
    border-color: #4ecdc4;
  }
`;

const ActionLink = styled(Link)`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;

  &.primary {
    background: #4ecdc4;
    color: white;

    &:hover {
      background: #45b7b8;
    }
  }

  &.secondary {
    background: #f8f9fa;
    color: #333;
    border: 1px solid #dee2e6;

    &:hover {
      background: #e9ecef;
    }
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const FiltersPanel = styled.div<{ $isOpen: boolean }>`
  margin-bottom: 1rem;
  padding: ${props => (props.$isOpen ? '1rem' : '0')};
  max-height: ${props => (props.$isOpen ? '200px' : '0')};
  overflow: hidden;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s ease;
  width: 100%;
  max-width: 600px;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-weight: 500;
    color: #333;
    font-size: 0.9rem;
  }

  select,
  input {
    padding: 0.5rem;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-size: 0.9rem;

    &:focus {
      outline: none;
      border-color: #4ecdc4;
    }
  }
`;

const SessionStats = styled.div`
  margin-top: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 12px;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-top: 0.5rem;
`;

const StatItem = styled.div`
  text-align: center;

  .number {
    font-size: 1.2rem;
    font-weight: 700;
    color: #333;
  }

  .label {
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #4ecdc4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  padding: 2rem;
  text-align: center;

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .error-message {
    color: #e74c3c;
    margin-bottom: 1rem;
    font-weight: 500;
  }

  .retry-button {
    padding: 0.5rem 1rem;
    background: #4ecdc4;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;

    &:hover {
      background: #45b7b8;
    }
  }
`;

export const DiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [pets, setPets] = useState<DiscoveryPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PetSearchFilters>({});
  const [session, setSession] = useState<SwipeSession>({
    sessionId: `session-${Date.now()}`,
    startTime: new Date().toISOString(),
    totalSwipes: 0,
    likes: 0,
    passes: 0,
    superLikes: 0,
    filters: {} as PetSearchFilters,
  });
  const [currentPetIndex, setCurrentPetIndex] = useState(0);

  // Load initial pets
  useEffect(() => {
    const loadPets = async () => {
      try {
        setLoading(true);
        setError(null);
        const discoveryQueue = await discoveryService.getDiscoveryQueue(filters, 20);
        setPets(discoveryQueue.pets);
        setCurrentPetIndex(0); // Reset to first pet when filters change
      } catch (error) {
        console.error('Failed to load pets:', error);
        setError('Failed to load pets. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadPets();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<PetSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setSession(prev => ({ ...prev, filters: { ...prev.filters, ...newFilters } }));
  }, []);

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  const retryLoading = useCallback(() => {
    setError(null);
    setFilters(prev => ({ ...prev })); // Trigger useEffect
  }, []);
  const handleSwipe = useCallback(
    async (action: SwipeAction) => {
      // Update session stats
      setSession(prev => ({
        ...prev,
        totalSwipes: prev.totalSwipes + 1,
        likes: prev.likes + (action.action === 'like' ? 1 : 0),
        passes: prev.passes + (action.action === 'pass' ? 1 : 0),
        superLikes: prev.superLikes + (action.action === 'super_like' ? 1 : 0),
      }));

      // Move to next pet
      setCurrentPetIndex(prev => prev + 1);

      // Record swipe action
      try {
        await discoveryService.recordSwipeAction({
          ...action,
          sessionId: session.sessionId,
        });
      } catch (error) {
        console.error('Failed to record swipe action:', error);
      }
    },
    [session.sessionId]
  );

  const handleEndReached = useCallback(async () => {
    // Load more pets when we're running low
    try {
      const lastPet = pets[pets.length - 1];
      if (lastPet) {
        const morePets = await discoveryService.loadMorePets(session.sessionId, lastPet.petId);
        if (morePets.length > 0) {
          setPets(prev => [...prev, ...morePets]);
        }
      }
    } catch (error) {
      console.error('Failed to load more pets:', error);
    }
  }, [pets, session.sessionId]);

  const handleControlAction = useCallback(
    (action: 'pass' | 'info' | 'like' | 'super_like') => {
      const currentPet = pets[currentPetIndex];
      if (!currentPet) return;

      // Handle info action differently - navigate to pet details
      if (action === 'info') {
        // Navigate to pet details page
        navigate(`/pets/${currentPet.petId}`);
        return;
      }

      const swipeAction: SwipeAction = {
        action,
        petId: currentPet.petId,
        timestamp: new Date().toISOString(),
        sessionId: session.sessionId,
      };

      handleSwipe(swipeAction);
    },
    [currentPetIndex, pets, session.sessionId, handleSwipe, navigate]
  );

  // Set session end time when component unmounts
  useEffect(() => {
    return () => {
      setSession(prev => ({
        ...prev,
        endTime: new Date().toISOString(),
      }));
    };
  }, []);

  const visiblePets = pets.slice(currentPetIndex);
  const hasNoPets = visiblePets.length === 0;

  return (
    <PageContainer>
      <Header>
        <Title>Discover Pets</Title>
        <HeaderActions>
          <FilterButton onClick={toggleFilters} className={showFilters ? 'active' : ''}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </FilterButton>
          <ActionLink to='/search' className='secondary'>
            List View
          </ActionLink>
          <ActionLink to='/favorites' className='primary'>
            Favorites
          </ActionLink>
        </HeaderActions>
      </Header>

      <MainContent>
        <FiltersPanel $isOpen={showFilters}>
          <FilterGrid>
            <FilterGroup>
              <label htmlFor='type'>Pet Type</label>
              <select
                id='type'
                value={filters.type || ''}
                onChange={e => handleFilterChange({ type: e.target.value })}
              >
                <option value=''>Any Type</option>
                <option value='dog'>Dogs</option>
                <option value='cat'>Cats</option>
              </select>
            </FilterGroup>

            <FilterGroup>
              <label htmlFor='ageGroup'>Age Group</label>
              <select
                id='ageGroup'
                value={filters.ageGroup || ''}
                onChange={e => handleFilterChange({ ageGroup: e.target.value })}
              >
                <option value=''>Any Age</option>
                <option value='puppy'>Puppy/Kitten</option>
                <option value='young'>Young</option>
                <option value='adult'>Adult</option>
                <option value='senior'>Senior</option>
              </select>
            </FilterGroup>

            <FilterGroup>
              <label htmlFor='size'>Size</label>
              <select
                id='size'
                value={filters.size || ''}
                onChange={e => handleFilterChange({ size: e.target.value })}
              >
                <option value=''>Any Size</option>
                <option value='small'>Small</option>
                <option value='medium'>Medium</option>
                <option value='large'>Large</option>
                <option value='extra_large'>Extra Large</option>
              </select>
            </FilterGroup>

            <FilterGroup>
              <label htmlFor='gender'>Gender</label>
              <select
                id='gender'
                value={filters.gender || ''}
                onChange={e => handleFilterChange({ gender: e.target.value })}
              >
                <option value=''>Any Gender</option>
                <option value='male'>Male</option>
                <option value='female'>Female</option>
              </select>
            </FilterGroup>
          </FilterGrid>
        </FiltersPanel>

        {loading ? (
          <LoadingState>
            <div className='spinner' />
            <div>Loading pets...</div>
          </LoadingState>
        ) : error ? (
          <ErrorState>
            <div className='error-icon'>
              <MdWarning />
            </div>
            <div className='error-message'>{error}</div>
            <button className='retry-button' onClick={retryLoading}>
              Try Again
            </button>
          </ErrorState>
        ) : (
          <>
            <SwipeStack
              pets={visiblePets}
              onSwipe={handleSwipe}
              onEndReached={handleEndReached}
              sessionId={session.sessionId}
            />

            {!hasNoPets && <SwipeControls onAction={handleControlAction} disabled={hasNoPets} />}
          </>
        )}

        <SessionStats>
          <div>Session Progress</div>
          <StatsGrid>
            <StatItem>
              <div className='number'>{session.totalSwipes}</div>
              <div className='label'>Total</div>
            </StatItem>
            <StatItem>
              <div className='number'>{session.likes}</div>
              <div className='label'>Likes</div>
            </StatItem>
            <StatItem>
              <div className='number'>{session.superLikes}</div>
              <div className='label'>Super</div>
            </StatItem>
            <StatItem>
              <div className='number'>{session.passes}</div>
              <div className='label'>Pass</div>
            </StatItem>
          </StatsGrid>
        </SessionStats>
      </MainContent>
    </PageContainer>
  );
};
