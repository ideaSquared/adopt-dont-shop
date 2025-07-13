import React, { useState } from 'react';
import {
  MdAutoFixHigh,
  MdChat,
  MdClose,
  MdFavorite,
  MdMenu,
  MdPerson,
  MdSearch,
  MdSwipe,
} from 'react-icons/md';
import { Link, useLocation } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px rgba(255, 64, 129, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 64, 129, 0.6);
  }
`;

const swipeAnimation = keyframes`
  0% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(10px) rotate(5deg); }
  75% { transform: translateX(-10px) rotate(-5deg); }
  100% { transform: translateX(0) rotate(0deg); }
`;

const NavbarContainer = styled.nav`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

const NavContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;

  @media (max-width: 768px) {
    padding: 0 1rem;
    height: 64px;
  }
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-decoration: none;
  transition: transform 0.3s ease;
  margin-right: 2rem;

  &:hover {
    transform: scale(1.03);
  }

  @media (max-width: 768px) {
    font-size: 1.3rem;
    margin-right: 1rem;
  }
`;

const LogoIcon = styled.div`
  font-size: 2rem;
  color: #ff4081;
`;

const NavItems = styled.div<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    flex-direction: column;
    padding: 1.5rem;
    gap: 1rem;
    transform: translateY(${({ $isOpen }) => ($isOpen ? '0' : '-100%')});
    transition: transform 0.3s ease;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const NavLink = styled(Link)<{ $isActive?: boolean; $isPrimary?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-weight: 500;
  color: white;
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  ${({ $isPrimary }) =>
    $isPrimary &&
    css`
      background: linear-gradient(45deg, #ff4081, #ff6ec7);
      box-shadow: 0 4px 15px rgba(255, 64, 129, 0.3);
      animation: ${pulseGlow} 3s ease-in-out infinite;
      font-weight: 600;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.6s;
      }

      &:hover::before {
        left: 100%;
      }

      .swipe-icon {
        animation: ${swipeAnimation} 2s ease-in-out infinite;
      }
    `}

  ${({ $isActive, $isPrimary }) =>
    $isActive &&
    !$isPrimary &&
    css`
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
    `}

  &:hover {
    background: ${({ $isPrimary }) =>
      $isPrimary ? 'linear-gradient(45deg, #e91e63, #ff4081)' : 'rgba(255, 255, 255, 0.1)'};
    transform: translateY(-2px);
  }

  .nav-icon {
    font-size: 1.25rem;
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    padding: 1rem;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: white;
  font-size: 1.4rem;
  cursor: pointer;
  padding: 0.6rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.25);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const SwipeCallout = styled.div`
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .sparkle {
    color: #ffd700;
    animation: ${swipeAnimation} 2s ease-in-out infinite;
    font-size: 0.85rem;
  }

  @media (max-width: 1100px) {
    display: none;
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;

  @media (max-width: 1024px) {
    gap: 1.5rem;
  }

  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const UserActionsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    gap: 0.75rem;
  }
`;

const PromoSection = styled.div`
  position: fixed;
  top: 1rem;
  right: 1.5rem;
  z-index: 1001;

  @media (max-width: 1100px) {
    display: none;
  }
`;

interface AppNavbarProps {
  className?: string;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ className }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <NavbarContainer className={className}>
      <NavContent>
        <Logo to='/'>
          <LogoIcon>🐾</LogoIcon>
          Adopt Don&apos;t Shop
        </Logo>

        <NavItems $isOpen={mobileMenuOpen}>
          <NavLink
            to='/discover'
            $isPrimary={true}
            $isActive={isActive('/discover')}
            onClick={() => setMobileMenuOpen(false)}
          >
            <MdSwipe className='nav-icon swipe-icon' />
            Discover Pets
          </NavLink>

          <NavLink
            to='/search'
            $isActive={isActive('/search')}
            onClick={() => setMobileMenuOpen(false)}
          >
            <MdSearch className='nav-icon' />
            Search
          </NavLink>

          {user && (
            <>
              <NavLink
                to='/favorites'
                $isActive={isActive('/favorites')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MdFavorite className='nav-icon' />
                Favorites
              </NavLink>

              <NavLink
                to='/chat'
                $isActive={isActive('/chat')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MdChat className='nav-icon' />
                Messages
              </NavLink>

              <NavLink
                to='/profile'
                $isActive={isActive('/profile')}
                onClick={() => setMobileMenuOpen(false)}
              >
                <MdPerson className='nav-icon' />
                Profile
              </NavLink>
            </>
          )}
        </NavItems>

        <RightSection>
          {user ? (
            <UserActionsGroup>
              <NotificationBell />
            </UserActionsGroup>
          ) : (
            <NavLink
              to='/login'
              $isActive={isActive('/login')}
              onClick={() => setMobileMenuOpen(false)}
            >
              <MdPerson className='nav-icon' />
              Login
            </NavLink>
          )}

          <MobileMenuButton onClick={toggleMobileMenu} aria-label='Toggle menu'>
            {mobileMenuOpen ? <MdClose /> : <MdMenu />}
          </MobileMenuButton>
        </RightSection>
      </NavContent>

      <PromoSection>
        <SwipeCallout>
          <MdAutoFixHigh className='sparkle' />
          Try our new swipe feature!
        </SwipeCallout>
      </PromoSection>
    </NavbarContainer>
  );
};
