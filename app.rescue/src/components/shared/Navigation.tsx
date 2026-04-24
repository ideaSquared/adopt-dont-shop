import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useChat } from '@/contexts/ChatContext';

const MainNavigation = styled.nav`
  width: 280px;
  min-width: 280px;
  height: 100vh;
  background: linear-gradient(
    180deg,
    ${props => props.theme.colors.primary[600]} 0%,
    ${props => props.theme.colors.primary[800]} 100%
  );
  color: white;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  overflow-y: auto;
`;

const NavHeader = styled.div`
  padding: 2rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
`;

const NavList = styled.ul`
  flex: 1;
  list-style: none;
  padding: 1rem 0;
  margin: 0;
`;

const NavItem = styled.li`
  margin: 0.25rem 0;
`;

const NavLink = styled(Link)<{ $isActive: boolean; $hasUnread?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 0 25px 25px 0;
  margin-right: 1rem;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
  }

  ${props =>
    props.$isActive &&
    `
    background-color: rgba(255, 255, 255, 0.15);
    color: white;
    font-weight: 600;
  `}

  ${props =>
    props.$hasUnread &&
    !props.$isActive &&
    `
    color: white;
    font-weight: 600;
  `}
`;

const NavIcon = styled.span`
  font-size: 1.25rem;
  margin-right: 0.75rem;
  width: 1.5rem;
  text-align: center;
`;

const NavLabel = styled.span`
  font-size: 0.95rem;
  flex: 1;
`;

const badgePulse = keyframes`
  0% { box-shadow: 0 0 0 0 var(--nav-badge-halo); }
  70% { box-shadow: 0 0 0 7px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

const NavBadge = styled.span`
  /* Halo tracks the theme's error color instead of a hardcoded red. */
  --nav-badge-halo: color-mix(
    in srgb,
    ${props => props.theme.colors.semantic.error[500]} 60%,
    transparent
  );

  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 11px;
  background: ${props => props.theme.colors.semantic.error[500]};
  color: ${props => props.theme.text.inverse};
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  margin-left: 0.5rem;
  animation: ${badgePulse} 2s ease-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const NavFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  font-size: 1.25rem;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const UserName = styled.span`
  font-weight: 600;
  font-size: 0.9rem;
`;

const UserRole = styled.span`
  font-size: 0.75rem;
  opacity: 0.8;
`;

const LogoutButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  width: 100%;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Navigation: React.FC = () => {
  const location = useLocation();
  const { user, logout, isLoading } = useAuth();
  const { unreadMessageCount } = useChat();

  const navItems: Array<{ path: string; label: string; icon: string; badge?: number }> = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/pets', label: 'Pets', icon: '🐕' },
    { path: '/applications', label: 'Applications', icon: '📋' },
    { path: '/staff', label: 'Staff', icon: '👥' },
    {
      path: '/communication',
      label: 'Messages',
      icon: '💬',
      badge: unreadMessageCount,
    },
    { path: '/events', label: 'Events', icon: '🗓️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatUserRole = (userType?: string) => {
    switch (userType) {
      case 'rescue_staff':
        return 'Rescue Staff';
      case 'admin':
        return 'Administrator';
      case 'moderator':
        return 'Moderator';
      default:
        return 'Staff Member';
    }
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) {
      return '👤';
    }
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '👤';
  };

  return (
    <MainNavigation>
      <NavHeader>
        <h2>🏠 Rescue Portal</h2>
      </NavHeader>

      <NavList>
        {navItems.map(item => {
          const hasUnread = typeof item.badge === 'number' && item.badge > 0;
          return (
            <NavItem key={item.path}>
              <NavLink
                to={item.path}
                $isActive={location.pathname === item.path}
                $hasUnread={hasUnread}
              >
                <NavIcon>{item.icon}</NavIcon>
                <NavLabel>{item.label}</NavLabel>
                {hasUnread && (
                  <NavBadge
                    aria-label={`${item.badge} unread message${item.badge === 1 ? '' : 's'}`}
                  >
                    {item.badge! > 99 ? '99+' : item.badge}
                  </NavBadge>
                )}
              </NavLink>
            </NavItem>
          );
        })}
      </NavList>

      <NavFooter>
        <UserInfo>
          <UserAvatar>{getUserInitials(user?.firstName, user?.lastName)}</UserAvatar>
          <UserDetails>
            <UserName>
              {user?.firstName} {user?.lastName}
            </UserName>
            <UserRole>{formatUserRole(user?.userType)}</UserRole>
          </UserDetails>
        </UserInfo>
        <LogoutButton onClick={handleLogout} disabled={isLoading}>
          {isLoading ? 'Signing Out...' : 'Sign Out'}
        </LogoutButton>
      </NavFooter>
    </MainNavigation>
  );
};

export default Navigation;
