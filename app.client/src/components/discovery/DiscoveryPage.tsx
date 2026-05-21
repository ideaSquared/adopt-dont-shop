import {
  DiscoveryPet,
  PetSearchFilters,
  SwipeAction,
  SwipeSession,
  discoveryService,
} from '@/services';
import { Container } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { loadDiscoveryState, recordViewedPet } from '@/utils/discoverySession';
import { useStatsig } from '@/hooks/useStatsig';
import { MdWarning } from 'react-icons/md';
import { Link, useNavigate } from 'react-router-dom';
import * as styles from './DiscoveryPage.css';
import { SwipeControls } from '../swipe/SwipeControls';
import { SwipeStack } from '../swipe/SwipeStack';
import { EndOfQueueEmptyState } from './EndOfQueueEmptyState';
import { ANON_FIRST_LIKE_FIRED_KEY, AnonymousFirstLikeModal } from './AnonymousFirstLikeModal';
import { ProfileCompletionMeter } from '../profile/ProfileCompletionMeter';

export const DiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [pets, setPets] = useState<DiscoveryPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PetSearchFilters>({});
  const persistedState = useMemo(() => loadDiscoveryState(), []);
  const [session, setSession] = useState<SwipeSession>({
    sessionId: persistedState.sessionId,
    startTime: new Date().toISOString(),
    totalSwipes: 0,
    likes: 0,
    passes: 0,
    superLikes: 0,
    filters: {} as PetSearchFilters,
  });
  const [viewedPetIds, setViewedPetIds] = useState<string[]>(persistedState.viewedPetIds);
  const [currentPetIndex, setCurrentPetIndex] = useState(0);
  const [undoStack, setUndoStack] = useState<SwipeAction[]>([]);
  // ADS-626: first-like modal state for anonymous users.
  const { isAuthenticated } = useAuth();
  const { logEvent } = useStatsig();
  const [anonLikeModalPet, setAnonLikeModalPet] = useState<DiscoveryPet | null>(null);
  // ADS-630: track whether `loadMorePets` has ever returned an empty page
  // — that's how we differentiate "queue truly exhausted" from "first
  // batch not arrived yet". Reset to true whenever the filter set
  // changes so a new preference set gets a fresh chance at backfill.
  const [hasMore, setHasMore] = useState(true);

  // Load initial pets
  useEffect(() => {
    const loadPets = async () => {
      try {
        setLoading(true);
        setError(null);
        // New filter set → assume there's more until proven otherwise.
        setHasMore(true);
        const discoveryQueue = await discoveryService.getDiscoveryQueue(filters);
        const filtered = discoveryQueue.pets.filter(pet => !viewedPetIds.includes(pet.petId));
        setPets(filtered);
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
      // ADS-626: surface the celebratory match modal on the *first*
      // anonymous like in this browser session. The flag lives in
      // sessionStorage so re-mounts within the same tab don't refire.
      // Only fires for `like` / `super_like` — `pass` is not a peak
      // emotional moment.
      if (
        !isAuthenticated &&
        (action.action === 'like' || action.action === 'super_like') &&
        typeof window !== 'undefined' &&
        window.sessionStorage.getItem(ANON_FIRST_LIKE_FIRED_KEY) !== 'true'
      ) {
        const likedPet = pets.find(p => p.petId === action.petId) ?? pets[currentPetIndex];
        if (likedPet) {
          window.sessionStorage.setItem(ANON_FIRST_LIKE_FIRED_KEY, 'true');
          setAnonLikeModalPet(likedPet);
          logEvent('anon_first_like_modal_shown', 1, { pet_id: likedPet.petId });
        }
      }

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

      // Track for undo
      setUndoStack(prev => [...prev, action].slice(-10));

      // Persist viewed pet so next session resumes correctly
      const next = recordViewedPet(action.petId);
      setViewedPetIds(next.viewedPetIds);

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
    [session.sessionId, isAuthenticated, pets, currentPetIndex, logEvent]
  );

  const handleEndReached = useCallback(async () => {
    // Load more pets when we're running low
    try {
      const lastPet = pets[pets.length - 1];
      if (lastPet) {
        const morePets = await discoveryService.loadMorePets(session.sessionId, lastPet.petId);
        if (morePets.length > 0) {
          setPets(prev => [...prev, ...morePets]);
        } else {
          // ADS-630: distinct from "haven't paginated yet" — backend
          // explicitly returned no further matches for this preference
          // set, so the empty state below is appropriate.
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Failed to load more pets:', error);
    }
  }, [pets, session.sessionId]);

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setCurrentPetIndex(idx => Math.max(0, idx - 1));
      setSession(s => ({
        ...s,
        totalSwipes: Math.max(0, s.totalSwipes - 1),
        likes: s.likes - (last.action === 'like' ? 1 : 0),
        passes: s.passes - (last.action === 'pass' ? 1 : 0),
        superLikes: s.superLikes - (last.action === 'super_like' ? 1 : 0),
      }));
      return prev.slice(0, -1);
    });
  }, []);

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
  // ADS-630: the empty state must only show after pagination has
  // actually returned an empty response — not just because the first
  // batch is still in-flight. The initial-load `loading` guard is
  // already enforced by the parent ternary.
  const isQueueExhausted = !loading && !error && hasNoPets && !hasMore;

  const handleAnonModalDismiss = useCallback(() => {
    if (anonLikeModalPet) {
      logEvent('anon_first_like_modal_dismissed', 1, { pet_id: anonLikeModalPet.petId });
    }
    setAnonLikeModalPet(null);
  }, [anonLikeModalPet, logEvent]);

  const handleAnonModalCta = useCallback(() => {
    if (anonLikeModalPet) {
      logEvent('anon_first_like_modal_clicked', 1, { pet_id: anonLikeModalPet.petId });
    }
    setAnonLikeModalPet(null);
  }, [anonLikeModalPet, logEvent]);

  return (
    <Container className={styles.pageContainer}>
      {anonLikeModalPet && (
        <AnonymousFirstLikeModal
          petId={anonLikeModalPet.petId}
          petName={anonLikeModalPet.name}
          petImage={anonLikeModalPet.images?.[0]}
          onDismiss={handleAnonModalDismiss}
          onCtaClick={handleAnonModalCta}
        />
      )}
      <ProfileCompletionMeter />
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
        ) : isQueueExhausted ? (
          <EndOfQueueEmptyState />
        ) : (
          <>
            <SwipeStack
              pets={visiblePets}
              onSwipe={handleSwipe}
              onEndReached={handleEndReached}
              sessionId={session.sessionId}
            />

            {!hasNoPets && (
              <SwipeControls
                onAction={handleControlAction}
                onUndo={handleUndo}
                canUndo={undoStack.length > 0}
                disabled={hasNoPets}
              />
            )}
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
