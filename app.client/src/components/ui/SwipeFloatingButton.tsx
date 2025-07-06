import React, { useEffect, useState } from 'react';
import { MdClose, MdSwipe } from 'react-icons/md';
import { Link, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

const bounce = keyframes`
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0,0,0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
`;

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(255, 64, 129, 0.7);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(255, 64, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 64, 129, 0);
  }
`;

const slideUp = keyframes`
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const FloatingContainer = styled.div<{ $show: boolean }>`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 999;
  display: ${({ $show }) => ($show ? 'flex' : 'none')};
  flex-direction: column;
  align-items: flex-end;
  gap: 1rem;
  animation: ${slideUp} 0.5s ease-out;

  @media (max-width: 768px) {
    bottom: 5rem;
    right: 1rem;
  }
`;

const CalloutBubble = styled.div<{ $show: boolean }>`
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 20px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  position: relative;
  display: ${({ $show }) => ($show ? 'block' : 'none')};
  max-width: 200px;
  animation: ${slideUp} 0.3s ease-out 0.2s both;

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    right: 2rem;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid white;
  }

  h4 {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  p {
    font-size: 0.75rem;
    margin: 0;
    color: #666;
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    max-width: 160px;
    padding: 0.875rem 1.25rem;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;

  &:hover {
    color: #666;
  }
`;

const FloatingButton = styled(Link)`
  width: 60px;
  height: 60px;
  background: linear-gradient(45deg, #ff4081, #ff6ec7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  text-decoration: none;
  box-shadow: 0 8px 25px rgba(255, 64, 129, 0.3);
  transition: all 0.3s ease;
  animation:
    ${pulse} 2s infinite,
    ${bounce} 3s ease-in-out infinite 1s;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 35px rgba(255, 64, 129, 0.4);
    animation: ${pulse} 1s infinite;
  }

  .icon {
    font-size: 1.5rem;
  }

  @media (max-width: 768px) {
    width: 56px;
    height: 56px;

    .icon {
      font-size: 1.375rem;
    }
  }
`;

interface SwipeFloatingButtonProps {
  className?: string;
}

export const SwipeFloatingButton: React.FC<SwipeFloatingButtonProps> = ({ className }) => {
  const location = useLocation();
  const [showCallout, setShowCallout] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Pages where we should show the floating button
  const showOnPages = ['/search', '/pets', '/profile', '/favorites'];
  const shouldShow = showOnPages.some(page => location.pathname.startsWith(page));

  // Don't show on discovery page or if dismissed
  const show = shouldShow && !location.pathname.startsWith('/discover') && !dismissed;

  useEffect(() => {
    // Show callout after a delay if not dismissed
    if (show && !dismissed) {
      const timer = setTimeout(() => {
        setShowCallout(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, dismissed]);

  useEffect(() => {
    // Reset callout when changing pages
    setShowCallout(false);
  }, [location.pathname]);

  const handleDismiss = () => {
    setShowCallout(false);
    setDismissed(true);
    // Store dismissal in localStorage to persist across sessions
    localStorage.setItem('swipeFloatingButtonDismissed', 'true');
  };

  // Check if previously dismissed
  useEffect(() => {
    const wasDismissed = localStorage.getItem('swipeFloatingButtonDismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  if (!show) return null;

  return (
    <FloatingContainer $show={show} className={className}>
      <CalloutBubble $show={showCallout && !dismissed}>
        <CloseButton onClick={handleDismiss} aria-label='Dismiss'>
          <MdClose />
        </CloseButton>
        <h4>Try Swiping! 🐾</h4>
        <p>Discover pets faster with our fun swipe feature</p>
      </CalloutBubble>

      <FloatingButton to='/discover' aria-label='Start swiping to discover pets'>
        <MdSwipe className='icon' />
      </FloatingButton>
    </FloatingContainer>
  );
};
