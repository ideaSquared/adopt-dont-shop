import {
  DiscoveryPet,
  PetSearchFilters,
  SwipeAction,
  SwipeSession,
  discoveryService,
} from '@/services';
import { Container } from '@adopt-dont-shop/lib.components';
import React, { useCallback, useEffect, useState } from 'react';
import { MdWarning } from 'react-icons/md';
import { Link, useNavigate } from 'react-router-dom';
import * as styles from './DiscoveryPage.css';
import { SwipeControls } from '../swipe/SwipeControls';
import { SwipeStack } from '../swipe/SwipeStack';

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
        const discoveryQueue = await discoveryService.getDiscoveryQueue(filters);
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
      if (!currentPet) {
        return;
      }

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
    <Container className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Discover Pets</h1>
        <div className={styles.headerActions}>
          <button className={styles.filterButton({ active: showFilters })} onClick={toggleFilters}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <Link className={styles.actionLinkSecondary} to='/search'>
            List View
          </Link>
          <Link className={styles.actionLinkPrimary} to='/favorites'>
            Favorites
          </Link>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.filtersPanel({ isOpen: showFilters })}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
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
            </div>

            <div className={styles.filterGroup}>
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
            </div>

            <div className={styles.filterGroup}>
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
            </div>

            <div className={styles.filterGroup}>
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
            </div>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <div>Loading pets...</div>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>
              <MdWarning />
            </div>
            <div className={styles.errorMessageText}>{error}</div>
            <button className={styles.retryButton} onClick={retryLoading}>
              Try Again
            </button>
          </div>
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

        <div className={styles.sessionStats}>
          <div>Session Progress</div>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>{session.totalSwipes}</div>
              <div className={styles.statLabel}>Total</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>{session.likes}</div>
              <div className={styles.statLabel}>Likes</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>{session.superLikes}</div>
              <div className={styles.statLabel}>Super</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>{session.passes}</div>
              <div className={styles.statLabel}>Pass</div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};
