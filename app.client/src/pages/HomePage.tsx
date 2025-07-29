import { PetCard } from '@/components/PetCard';
import { SwipeHero } from '@/components/hero/SwipeHero';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { useStatsig } from '@/hooks/useStatsig';
import { petService } from '@/services';
import { Pet } from '@/services';
import { Button, Spinner } from '@adopt-dont-shop/components';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;

  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

const Section = styled.section`
  padding: 4rem 0;

  h2 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 3rem;
    color: ${props => props.theme.text.primary};
  }

  @media (max-width: 768px) {
    padding: 3rem 0;

    h2 {
      font-size: 2rem;
      margin-bottom: 2rem;
    }
  }
`;

const PetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
`;

const StatsSection = styled.section`
  background-color: ${props => props.theme.background.secondary};
  padding: 4rem 0;

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    text-align: center;
  }

  .stat-item {
    h3 {
      font-size: 3rem;
      color: ${props => props.theme.colors.primary[500]};
      margin-bottom: 0.5rem;
    }

    p {
      font-size: 1.25rem;
      color: ${props => props.theme.text.tertiary};
    }
  }

  @media (max-width: 768px) {
    .stat-item h3 {
      font-size: 2rem;
    }

    .stat-item p {
      font-size: 1rem;
    }
  }
`;

const CTASection = styled.section`
  background-color: ${props => props.theme.colors.primary[500]};
  color: white;
  padding: 4rem 0;
  text-align: center;

  h2 {
    color: white;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.semantic.error[500]};
  background-color: ${props => props.theme.background.error};
  border-radius: 8px;
  margin: 2rem 0;
`;

export const HomePage: React.FC = () => {
  const [featuredPets, setFeaturedPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewHero, setShowNewHero] = useState(false);
  const { isAuthenticated } = useAuth();
  const { logEvent } = useStatsig();
  const { trackPageView, trackEvent } = useAnalytics();
  const { isFeatureEnabled } = useFeatureFlags();

  useEffect(() => {
    // Check feature flags
    const checkFeatureFlags = async () => {
      try {
        const newHeroEnabled = await isFeatureEnabled('new_hero_design');
        setShowNewHero(newHeroEnabled);
        
        // Track feature flag impression
        trackEvent({
          category: 'feature_flags',
          action: 'hero_variant_shown',
          label: newHeroEnabled ? 'new_hero' : 'original_hero',
          sessionId: 'homepage-session',
          timestamp: new Date(),
          properties: {
            variant: newHeroEnabled ? 'new_hero' : 'original_hero',
            user_authenticated: isAuthenticated,
          }
        });
      } catch (error) {
        console.warn('Failed to check feature flags:', error);
        setShowNewHero(false);
      }
    };

    checkFeatureFlags();

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
          }
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
          }
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
  }, [isAuthenticated, logEvent, trackPageView, trackEvent, isFeatureEnabled]);

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
      }
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
      }
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
        <Section style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', textAlign: 'center' }}>
          <Container>
            <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>Find Your Perfect Companion</h1>
            <p style={{ fontSize: '1.5rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
              Every pet deserves a loving home. Browse thousands of adoptable pets and find your new best friend today.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant='primary' size='lg' onClick={() => handleCTAClick('browse_pets')}>
                Start Browsing Pets
              </Button>
              <Button variant='outline' size='lg' onClick={() => handleCTAClick('get_started')}>
                Learn More
              </Button>
            </div>
          </Container>
        </Section>
      ) : (
        <SwipeHero />
      )}

      {/* Featured Pets Section */}
      <Section>
        <Container>
          <h2>Featured Pets</h2>

          {isLoading && (
            <LoadingContainer>
              <Spinner />
            </LoadingContainer>
          )}

          {error && <ErrorMessage>{error}</ErrorMessage>}

          {!isLoading && !error && (
            <>
              <PetGrid>
                {featuredPets.map(pet => (
                  <PetCard key={pet.pet_id} pet={pet} />
                ))}
              </PetGrid>

              <div style={{ textAlign: 'center' }}>
                <Link to='/search' onClick={handleViewAllPetsClick}>
                  <Button variant='outline'>View All Pets</Button>
                </Link>
              </div>
            </>
          )}
        </Container>
      </Section>

      {/* Statistics Section */}
      <StatsSection>
        <Container>
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
        </Container>
      </StatsSection>

      {/* Call to Action Section */}
      <CTASection>
        <Container>
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
        </Container>
      </CTASection>
    </div>
  );
};
