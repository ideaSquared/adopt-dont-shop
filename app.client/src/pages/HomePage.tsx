import { PetCard } from '@/components/PetCard';
import { SwipeHero } from '@/components/hero/SwipeHero';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useStatsig } from '@/hooks/useStatsig';
import { useFeatureGate } from '@adopt-dont-shop/lib.feature-flags';
import { petService, Pet } from '@/services';
import { Button, Spinner } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as styles from './HomePage.css';

export const HomePage: React.FC = () => {
  const [featuredPets, setFeaturedPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

    const loadFeaturedPets = async () => {
      try {
        setIsLoading(true);
        const pets = await petService.getFeaturedPets(8);
        setFeaturedPets(pets);

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
      } catch (err) {
        setError('Failed to load featured pets. Please try again later.');
        console.error('Error loading featured pets:', err);

        // Track error with new analytics service
        trackEvent({
          category: 'homepage',
          action: 'featured_pets_load_error',
          label: 'pet_loading_failed',
          sessionId: 'homepage-session',
          timestamp: new Date(),
          properties: {
            error_message: err instanceof Error ? err.message : 'Unknown error',
            user_authenticated: isAuthenticated,
          },
        });

        // Log error (existing Statsig tracking)
        logEvent('featured_pets_load_error', 1, {
          error_message: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFeaturedPets();
  }, [isAuthenticated, logEvent, trackPageView, trackEvent, showNewHero]);

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

  const handleCTAClick = (action: 'browse_pets' | 'get_started') => {
    // Track with new analytics service
    trackEvent({
      category: 'homepage',
      action: 'cta_clicked',
      label: action,
      sessionId: 'homepage-session',
      timestamp: new Date(),
      properties: {
        cta_action: action,
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
            <span className={styles.heroEyebrow}>10,000+ adopted · 500+ rescue partners</span>
            <h1 className={styles.heroTitle}>Find Your Perfect Companion</h1>
            <p className={styles.heroSubtitle}>
              Every pet deserves a loving home. Browse thousands of adoptable pets and find your new
              best friend today.
            </p>
            <div className={styles.heroActions}>
              <Link to='/search' onClick={() => handleCTAClick('browse_pets')}>
                <Button
                  variant='primary'
                  size='lg'
                  style={{
                    background: 'white',
                    color: '#BE123C',
                    borderColor: 'white',
                  }}
                >
                  Start Browsing Pets
                </Button>
              </Link>
              <Button
                variant='outline'
                size='lg'
                onClick={() => handleCTAClick('get_started')}
                style={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.08)',
                }}
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <SwipeHero />
      )}

      {/* Featured Pets Section */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2>Featured Pets</h2>

          {isLoading && (
            <div className={styles.loadingContainer}>
              <Spinner />
            </div>
          )}

          {error && <div className={styles.errorMessage}>{error}</div>}

          {!isLoading && !error && (
            <>
              <div className={styles.petGrid}>
                {featuredPets.map(pet => (
                  <PetCard key={pet.pet_id} pet={pet} />
                ))}
              </div>

              <div style={{ textAlign: 'center' }}>
                <Link to='/search' onClick={handleViewAllPetsClick}>
                  <Button variant='outline'>View All Pets</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Statistics Section */}
      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className='stats-grid'>
            <div className='stat-item'>
              <h3>10,000+</h3>
              <p>Pets Adopted</p>
            </div>
            <div className='stat-item'>
              <h3>500+</h3>
              <p>Rescue Partners</p>
            </div>
            <div className='stat-item'>
              <h3>50+</h3>
              <p>States Covered</p>
            </div>
            <div className='stat-item'>
              <h3>24/7</h3>
              <p>Support Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <h2>Ready to Make a Difference?</h2>
          <p>
            {isAuthenticated
              ? 'Browse our available pets and find your new best friend today!'
              : 'Create your account and start your adoption journey today!'}
          </p>
          {isAuthenticated ? (
            <Link to='/search' onClick={() => handleCTAClick('browse_pets')}>
              <Button size='lg' variant='secondary'>
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
