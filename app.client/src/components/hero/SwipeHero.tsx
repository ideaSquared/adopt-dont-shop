import React from 'react';
import { MdAutoFixHigh, MdFlashOn, MdSearch, MdSwipe, MdTrendingUp } from 'react-icons/md';
import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const HeroContainer = styled.section`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  padding: 4rem 0 5rem;
  color: white;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="10" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="10" cy="90" r="2.5" fill="rgba(255,255,255,0.1)"/><circle cx="60" cy="30" r="1.2" fill="rgba(255,255,255,0.1)"/></svg>');
    opacity: 0.6;
    animation: ${float} 20s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    padding: 3rem 0 4rem;
  }
`;

const HeroContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  text-align: center;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

const MainHeading = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  line-height: 1.2;
  background: linear-gradient(45deg, #ffffff, #f8f9fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.25rem;
  margin-bottom: 3rem;
  opacity: 0.9;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }
`;

const CTAContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const PrimaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(45deg, #ff4081, #ff6ec7);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 8px 30px rgba(255, 64, 129, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  animation: ${pulse} 3s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -200px;
    width: 200px;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: ${shimmer} 3s infinite;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(255, 64, 129, 0.4);
    animation: none;
  }

  .icon {
    font-size: 1.5rem;
    animation: ${float} 2s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.75rem;
    font-size: 1rem;
    width: 100%;
    max-width: 280px;
    justify-content: center;
  }
`;

const SecondaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 500;
  font-size: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.75rem;
    width: 100%;
    max-width: 280px;
    justify-content: center;
  }
`;

const FeatureCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const FeatureCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }

  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #ff4081;
    display: block;
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  p {
    opacity: 0.8;
    line-height: 1.5;
  }
`;

const SwipeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
  color: #ffd700;

  .sparkle {
    animation: ${float} 1.5s ease-in-out infinite;
  }
`;

export const SwipeHero: React.FC = () => {
  return (
    <HeroContainer>
      <HeroContent>
        <SwipeBadge>
          <MdAutoFixHigh className='sparkle' />
          New: AI-Powered Pet Matching
        </SwipeBadge>

        <MainHeading>
          Find Your Perfect
          <br />
          Companion with a Swipe
        </MainHeading>

        <Subtitle>
          Discover amazing pets waiting for their forever home. Our innovative swipe feature uses
          smart matching to help you find the perfect companion based on your preferences and
          lifestyle.
        </Subtitle>

        <CTAContainer>
          <PrimaryButton to='/discover'>
            <MdSwipe className='icon' />
            Start Swiping Now
          </PrimaryButton>
          <SecondaryButton to='/search'>
            <MdSearch />
            Browse All Pets
          </SecondaryButton>
        </CTAContainer>

        <FeatureCards>
          <FeatureCard>
            <MdSwipe className='icon' />
            <h3>Smart Swiping</h3>
            <p>Swipe right to like, left to pass. Our algorithm learns your preferences!</p>
          </FeatureCard>

          <FeatureCard>
            <MdTrendingUp className='icon' />
            <h3>Instant Matching</h3>
            <p>Get matched with pets that fit your lifestyle and preferences in real-time.</p>
          </FeatureCard>

          <FeatureCard>
            <MdFlashOn className='icon' />
            <h3>Quick & Fun</h3>
            <p>Finding your new best friend has never been this easy and entertaining!</p>
          </FeatureCard>
        </FeatureCards>
      </HeroContent>
    </HeroContainer>
  );
};
