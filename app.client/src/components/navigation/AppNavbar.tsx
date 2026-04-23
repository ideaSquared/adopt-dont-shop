import React from 'react';
import { MdChat, MdFavorite, MdNotifications, MdSearch, MdSwipe } from 'react-icons/md';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Badge } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useChat } from '@/contexts/ChatContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { AuthCtas } from './AuthCtas';
import { NavLink } from './NavLink';
import { NavUserMenu } from './NavUserMenu';

const NavbarContainer = styled.nav`
  background: ${({ theme }) => theme.colors.gradients.primary};
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const NavContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  height: 64px;

  @media (max-width: 768px) {
    height: 56px;
    padding: 0 ${({ theme }) => theme.spacing[3]};
    gap: ${({ theme }) => theme.spacing[2]};
  }
`;

const Logo = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  white-space: nowrap;

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.border.radius.sm};
  }
`;

const LogoIcon = styled.span`
  font-size: 1.75rem;
  line-height: 1;
`;

const PrimaryLinks = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};

  @media (max-width: 768px) {
    display: none;
  }
`;

const RightSlot = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-left: auto;
`;

const IconLinkAnchor = styled(Link)<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.border.radius.md};
  color: #fff;
  text-decoration: none;
  transition: background ${({ theme }) => theme.transitions.fast};
  background: ${({ $active }) => ($active ? 'rgba(255, 255, 255, 0.18)' : 'transparent')};

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 2px;
  }

  svg {
    font-size: 1.375rem;
  }
`;

const BadgeOverlay = styled.span<{ $hasCount: boolean }>`
  position: absolute;
  top: -2px;
  right: -2px;
  pointer-events: none;

  /* Custom count bubble: red semantic-500, 2px navbar-colored ring so it
     separates cleanly from the dark purple icon background, 18px minimum
     so the digit meets WCAG minimum target-size guidance and stays
     readable at a glance. Overrides the library Badge defaults which
     were too small and lacked the ring. */
  span[role='status'] {
    min-width: 18px;
    min-height: 18px;
    padding: 0 5px;
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.02em;
    background: #dc2626;
    color: #fff;
    border: 2px solid ${({ theme }) => theme.colors.primary[700] || '#4f46e5'};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  }
`;

const srOnly = {
  position: 'absolute' as const,
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap' as const,
  border: 0,
};

type IconLinkProps = {
  to: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
};

const IconLink: React.FC<IconLinkProps> = ({ to, label, icon, count = 0 }) => {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
  const ariaLabel =
    count > 0 ? `${label}, ${count} unread ${count === 1 ? 'item' : 'items'}` : label;
  return (
    <IconLinkAnchor to={to} $active={active} aria-label={ariaLabel}>
      {icon}
      {count > 0 && (
        <BadgeOverlay $hasCount aria-hidden='true'>
          <Badge variant='count' max={99}>
            {count}
          </Badge>
        </BadgeOverlay>
      )}
      {/* Redundant sr-only counter for AT users who don't surface aria-label */}
      {count > 0 && <span style={srOnly}>{`${count} unread`}</span>}
    </IconLinkAnchor>
  );
};

export type AppNavbarProps = {
  className?: string;
};

export const AppNavbar: React.FC<AppNavbarProps> = ({ className }) => {
  const { isAuthenticated } = useAuth();
  const { unreadCount: notificationsUnread } = useNotifications();
  const { unreadMessageCount } = useChat();

  return (
    <NavbarContainer className={className}>
      <NavContent>
        <Logo to='/'>
          <LogoIcon aria-hidden='true'>🐾</LogoIcon>
          Adopt Don&apos;t Shop
        </Logo>

        <PrimaryLinks>
          <NavLink to='/discover' icon={<MdSwipe aria-hidden='true' />} primary>
            Discover
          </NavLink>
          <NavLink to='/search' icon={<MdSearch aria-hidden='true' />}>
            Search
          </NavLink>
          {isAuthenticated && (
            <NavLink to='/favorites' icon={<MdFavorite aria-hidden='true' />}>
              Favorites
            </NavLink>
          )}
        </PrimaryLinks>

        <RightSlot>
          {isAuthenticated ? (
            <>
              <IconLink
                to='/chat'
                label='Messages'
                icon={<MdChat aria-hidden='true' />}
                count={unreadMessageCount}
              />
              <IconLink
                to='/notifications'
                label='Notifications'
                icon={<MdNotifications aria-hidden='true' />}
                count={notificationsUnread}
              />
              <NavUserMenu />
            </>
          ) : (
            <AuthCtas />
          )}
        </RightSlot>
      </NavContent>
    </NavbarContainer>
  );
};
