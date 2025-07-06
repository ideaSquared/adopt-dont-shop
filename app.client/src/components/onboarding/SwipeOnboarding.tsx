import React, { useEffect, useState } from 'react';
import { MdArrowForward, MdClose, MdFavorite, MdInfo, MdSwipe } from 'react-icons/md';
import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const swipeDemo = keyframes`
  0% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(15px) rotate(5deg); }
  50% { transform: translateX(-15px) rotate(-5deg); }
  75% { transform: translateX(10px) rotate(3deg); }
  100% { transform: translateX(0) rotate(0deg); }
`;

const Overlay = styled.div<{ $show: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: ${({ $show }) => ($show ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 24px;
  padding: 2.5rem;
  max-width: 500px;
  width: 100%;
  text-align: center;
  position: relative;
  animation: ${slideIn} 0.4s ease-out;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    padding: 2rem;
    margin: 1rem;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: #f5f5f5;
    color: #666;
  }

  svg {
    width: 24px;
    height: 24px;
  }
`;

const IconContainer = styled.div`
  margin-bottom: 1.5rem;
`;

const SwipeIcon = styled.div`
  display: inline-block;
  font-size: 4rem;
  color: #ff4081;
  animation: ${swipeDemo} 3s ease-in-out infinite;
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #333;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const Features = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
  text-align: left;
`;

const Feature = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 12px;

  .icon {
    font-size: 1.5rem;
    color: #ff4081;
    flex-shrink: 0;
  }

  .content {
    flex: 1;
  }

  .title {
    font-weight: 600;
    color: #333;
    margin: 0 0 0.25rem 0;
    font-size: 0.9rem;
  }

  .desc {
    color: #666;
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.3;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(45deg, #ff4081, #ff6ec7);
  color: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 64, 129, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 64, 129, 0.4);
  }

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const SecondaryButton = styled.button`
  background: none;
  border: 2px solid #e9ecef;
  color: #666;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #dee2e6;
    background: #f8f9fa;
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

interface SwipeOnboardingProps {
  onClose: () => void;
}

export const SwipeOnboarding: React.FC<SwipeOnboardingProps> = ({ onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('hasSeenSwipeOnboarding');

    if (!hasSeenOnboarding) {
      // Show after a short delay
      const timer = setTimeout(() => {
        setShow(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    localStorage.setItem('hasSeenSwipeOnboarding', 'true');
    onClose();
  };

  const handleStartSwiping = () => {
    localStorage.setItem('hasSeenSwipeOnboarding', 'true');
    onClose();
  };

  if (!show) return null;

  return (
    <Overlay $show={show} onClick={handleClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <CloseButton onClick={handleClose} aria-label='Close'>
          <MdClose />
        </CloseButton>

        <IconContainer>
          <SwipeIcon>
            <MdSwipe />
          </SwipeIcon>
        </IconContainer>

        <Title>Meet Your New Favorite Feature!</Title>
        <Subtitle>
          Swipe through adorable pets and find your perfect match in seconds. It&apos;s fast, fun,
          and incredibly effective!
        </Subtitle>

        <Features>
          <Feature>
            <MdArrowForward className='icon' />
            <div className='content'>
              <div className='title'>Swipe Right to Like</div>
              <div className='desc'>Found a cutie? Swipe right to add them to your favorites!</div>
            </div>
          </Feature>

          <Feature>
            <MdFavorite className='icon' />
            <div className='content'>
              <div className='title'>Smart Matching</div>
              <div className='desc'>
                Our algorithm learns your preferences to show better matches
              </div>
            </div>
          </Feature>

          <Feature>
            <MdInfo className='icon' />
            <div className='content'>
              <div className='title'>Quick Info</div>
              <div className='desc'>Swipe down to see more details about any pet</div>
            </div>
          </Feature>
        </Features>

        <ButtonContainer>
          <PrimaryButton to='/discover' onClick={handleStartSwiping}>
            <MdSwipe />
            Start Swiping
          </PrimaryButton>
          <SecondaryButton onClick={handleClose}>Maybe Later</SecondaryButton>
        </ButtonContainer>
      </ModalContent>
    </Overlay>
  );
};
