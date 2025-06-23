import { PetCard } from '@/components/PetCard';
import { useAuth } from '@/contexts/AuthContext';
import { petService } from '@/services/petService';
import { Pet } from '@/types';
import { Button, Spinner } from '@adopt-dont-shop/components';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const HeroSection = styled.section`
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary.main} 0%,
    ${props => props.theme.colors.secondary.main} 100%
  );
  color: white;
  padding: 4rem 2rem;
  text-align: center;

  h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    font-weight: 700;
  }

  p {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    padding: 3rem 1rem;

    h1 {
      font-size: 2rem;
    }

    p {
      font-size: 1rem;
    }
  }
`;

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
    color: ${props => props.theme.text.body};
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
  background-color: ${props => props.theme.background.contrast};
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
      color: ${props => props.theme.colors.primary.main};
      margin-bottom: 0.5rem;
    }

    p {
      font-size: 1.25rem;
      color: ${props => props.theme.text.dim};
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
  background-color: ${props => props.theme.colors.primary.main};
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
  color: ${props => props.theme.colors.semantic.error.main};
  background-color: ${props => props.theme.background.danger};
  border-radius: 8px;
  margin: 2rem 0;
`;

export const HomePage: React.FC = () => {
  const [featuredPets, setFeaturedPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const loadFeaturedPets = async () => {
      try {
        setIsLoading(true);
        const pets = await petService.getFeaturedPets(8);
        setFeaturedPets(pets);
      } catch (err) {
        setError('Failed to load featured pets. Please try again later.');
        console.error('Error loading featured pets:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeaturedPets();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <HeroSection>
        <Container>
          <h1>Find Your Perfect Companion</h1>
          <p>
            Connect with loving pets from trusted rescue organizations. Every adoption saves a life
            and makes room for another pet in need.
          </p>
          <Link to='/search'>
            <Button size='lg' variant='secondary'>
              Start Searching
            </Button>
          </Link>
        </Container>
      </HeroSection>

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
                  <PetCard key={pet.petId} pet={pet} />
                ))}
              </PetGrid>

              <div style={{ textAlign: 'center' }}>
                <Link to='/search'>
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
            <Link to='/search'>
              <Button size='lg' variant='secondary'>
                Browse Pets
              </Button>
            </Link>
          ) : (
            <Link to='/register'>
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
