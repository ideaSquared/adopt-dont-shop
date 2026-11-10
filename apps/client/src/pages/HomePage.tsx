import { PetCard } from '@/components/PetCard';
import { SwipeHero } from '@/components/hero/SwipeHero';
import { TopPicksHomeModule } from '@/components/home/TopPicksHomeModule';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useStatsig } from '@/hooks/useStatsig';
import { useFeatureGate } from '@adopt-dont-shop/lib.feature-flags';
import { petService } from '@/services';
import { Button, EmptyState, ErrorState } from '@adopt-dont-shop/lib.components';
import { useQuery } from '@tanstack/react-query';
import { PetCardSkeletonGrid } from '@/components/skeletons';
import React, { useEffect } from 'react';
import { Link } from 'react-router';
import * as styles from './HomePage.css';

const FEATURED_PET_COUNT = 8;

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { logEvent } = useStatsig();
  const { trackPageView, trackEvent } = useAnalytics();
  const { value: showNewHero } = useFeatureGate('new_hero_design');

  useEffect(() => {
    // Track feature flag impression
    trackEvent({
      category: 'feature_flags',
      action: 'hero_variant_shown',
      label: showNewHero ? 'new_hero' : 'original_hero',
      sessionId: 'homepage-session',
      timestamp: new Date(),
      properties: {
        variant: showNewHero ? 'new_hero' : 'original_hero',
        user_authenticated: isAuthenticated,
      },
    });

    // Track page view with new analytics service
    trackPageView('/');

    // Log page view (existing Statsig tracking)
    logEvent('homepage_viewed', 1, {
      user_authenticated: isAuthenticated.toString(),
      timestamp: new Date().toISOString(),
    });
  }, [isAuthenticated, logEvent, trackPageView, trackEvent, showNewHero]);

  const featuredQuery = useQuery({
    queryKey: ['pets', 'featured', FEATURED_PET_COUNT],
    queryFn: async () => {
      const featured = await petService.getFeaturedPets(FEATURED_PET_COUNT);
      // No pet is flagged as featured yet: show the newest listings instead of a blank section.
      return featured.length > 0 ? featured : petService.getRecentPets(FEATURED_PET_COUNT);
    },
    staleTime: 5 * 60 * 1000,
  });
  const featuredPets = featuredQuery.data ?? [];
  const isLoading = featuredQuery.isLoading;
  const error = featuredQuery.isError
    ? 'Failed to load featured pets. Please try again later.'
    : null;

  useEffect(() => {
    const pets = featuredQuery.data;
    if (!pets) {
      return;
    }
    // Track with new analytics service
    trackEvent({
      category: 'homepage',
      action: 'featured_pets_loaded',
      label: 'pet_loading_success',
      value: pets.length,
      sessionId: 'homepage-session', // This would normally come from a session manager
      timestamp: new Date(),
      properties: {
        pet_count: pets.length,
        user_authenticated: isAuthenticated,
      },
    });

    // Log successful load (existing Statsig tracking)
    logEvent('featured_pets_loaded', pets.length, {
      pet_count: pets.length.toString(),
      load_time_ms: (Date.now() - performance.now()).toString(),
    });
    // Fire once per successful fetch, not on every identity change of the trackers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredQuery.dataUpdatedAt]);

  useEffect(() => {
    const err = featuredQuery.error;
    if (!err) {
      return;
    }
    console.error('Error loading featured pets:', err);

    // Track error with new analytics service
    trackEvent({
      category: 'homepage',
      action: 'featured_pets_load_error',
      label: 'pet_loading_failed',
      sessionId: 'homepage-session',
      timestamp: new Date(),
      properties: {
        error_message: err.message || 'Unknown error',
        user_authenticated: isAuthenticated,
      },
    });

    // Log error (existing Statsig tracking)
    logEvent('featured_pets_load_error', 1, {
      error_message: err.message || 'Unknown error',
    });
    // Fire once per failed fetch, not on every identity change of the trackers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredQuery.errorUpdatedAt]);

  const handleViewAllPetsClick = () => {
    // Track with new analytics service
    trackEvent({
      category: 'homepage',
      action: 'view_all_pets_clicked',
      label: 'navigation_to_search',
      sessionId: 'homepage-session',
      timestamp: new Date(),
      properties: {
        featured_pets_count: featuredPets.length,
        user_authenticated: isAuthenticated,
      },
    });

    // Existing Statsig tracking
    logEvent('homepage_view_all_pets_clicked', 1, {
      featured_pets_count: featuredPets.length.toString(),
      user_authenticated: isAuthenticated.toString(),
    });
  };

  const handleCTAClick = (action: 'browse_pets' | 'get_started' | 'learn_more') => {
    // Track with new analytics service
    trackEvent({
      category: 'homepage',
      action: 'cta_clicked',
      label: action,
      sessionId: 'homepage-session',
      timestamp: new Date(),
      properties: {
        cta_action: action,
        entry_path: action === 'browse_pets' ? 'search' : action,
        source: 'homepage_cta',
        user_authenticated: isAuthenticated,
        featured_pets_visible: featuredPets.length,
        hero_variant: showNewHero ? 'new_hero' : 'original_hero',
      },
    });

    // Existing Statsig tracking
    logEvent('homepage_cta_clicked', 1, {
      cta_action: action,
      user_authenticated: isAuthenticated.toString(),
      featured_pets_visible: featuredPets.length.toString(),
      hero_variant: showNewHero ? 'new_hero' : 'original_hero',
    });
  };

  return (
    <div>
      {/* Hero Section - A/B Test with Feature Flags */}
      {showNewHero ? (
        <section className={styles.heroSection}>
          <div className={styles.heroGlow} aria-hidden />
          <div className={`${styles.container} ${styles.heroInner}`}>
            <span className={styles.heroEyebrow}>Rescue pets, matched to you</span>
            <h1 className={styles.heroTitle}>Find Your Next Companion</h1>
            <p className={styles.heroSubtitle}>
              Every pet deserves a loving home. Browse adoptable pets from verified rescues and
              start your adoption journey.
            </p>
            <div className={styles.heroActions}>
              <Link to='/search' onClick={() => handleCTAClick('browse_pets')}>
                <Button variant='primary' size='lg' className={styles.heroPrimaryButton}>
                  Start Browsing Pets
                </Button>
              </Link>
              <Link to='/help' onClick={() => handleCTAClick('learn_more')}>
                <Button variant='outline' size='lg' className={styles.heroSecondaryButton}>
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <SwipeHero />
      )}

      {/* ADS-636: surface personalised picks when the user has prefs */}
      <TopPicksHomeModule />

      {/* Featured Pets Section */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2>Featured Pets</h2>

          {isLoading && (
            <div className={styles.petGrid}>
              <PetCardSkeletonGrid count={8} />
            </div>
          )}

          {error && <ErrorState message={error} onRetry={() => void featuredQuery.refetch()} />}

          {!isLoading && !error && (
            <>
              {featuredPets.length === 0 ? (
                <EmptyState
                  title='No pets listed right now'
                  description='New pets are added all the time, so please check back soon.'
                />
              ) : (
                <div className={styles.petGrid}>
                  {featuredPets.map(pet => (
                    <PetCard key={pet.pet_id} pet={pet} />
                  ))}
                </div>
              )}

              <div className={styles.centerAlign}>
                <Link to='/search' onClick={handleViewAllPetsClick}>
                  <Button variant='outline'>View All Pets</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Call to Action Section */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <h2>Ready to Make a Difference?</h2>
          <p>
            {isAuthenticated
              ? 'Browse our available pets and find your next companion.'
              : 'Create your account and start your adoption journey.'}
          </p>
          {isAuthenticated ? (
            <Link to='/search' onClick={() => handleCTAClick('browse_pets')}>
              <Button variant='outline' className={styles.ctaSecondaryButton}>
                Browse Pets
              </Button>
            </Link>
          ) : (
            <Link to='/register' onClick={() => handleCTAClick('get_started')}>
              <Button size='lg' variant='secondary'>
                Get Started
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};
