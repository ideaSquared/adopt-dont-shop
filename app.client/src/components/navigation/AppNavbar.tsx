import React from 'react';
import { MdChat, MdFavorite, MdNotifications, MdSearch, MdStar, MdSwipe } from 'react-icons/md';
import { Link, useLocation } from 'react-router-dom';
import { Badge, Logo } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useChat } from '@/contexts/ChatContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useMatchPreferences } from '@/hooks/useMatchPreferences';
import { AuthCtas } from './AuthCtas';
import { NavLink } from './NavLink';
import { NavUserMenu } from './NavUserMenu';
import * as styles from './AppNavbar.css';

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
    <Link className={styles.iconLinkAnchor({ active })} to={to} aria-label={ariaLabel}>
      {icon}
      {count > 0 && (
        <span className={styles.badgeOverlay} aria-hidden='true'>
          <Badge variant='count' max={99}>
            {count}
          </Badge>
        </span>
      )}
      {/* Redundant sr-only counter for AT users who don't surface aria-label */}
      {count > 0 && <span style={srOnly}>{`${count} unread`}</span>}
    </Link>
  );
};

export type AppNavbarProps = {
  className?: string;
};

export const AppNavbar: React.FC<AppNavbarProps> = ({ className }) => {
  const { isAuthenticated } = useAuth();
  const { unreadCount: notificationsUnread } = useNotifications();
  const { unreadMessageCount } = useChat();
  const { trackEvent } = useAnalytics();
  const { hasPreferences } = useMatchPreferences();

  const trackNavClick = (entryPath: 'discover' | 'search' | 'favorites' | 'top_picks') => {
    trackEvent({
      category: 'navigation',
      action: 'primary_nav_clicked',
      label: entryPath,
      sessionId: 'app-navbar-session',
      timestamp: new Date(),
      properties: {
        entry_path: entryPath,
        source: 'app_navbar',
        user_authenticated: isAuthenticated,
      },
    });
  };

  return (
    <nav className={`${styles.navbarContainer}${className ? ` ${className}` : ''}`}>
      <div className={styles.navContent}>
        <Link className={styles.logo} to='/'>
          <Logo size={32} showWordmark darkBg />
        </Link>

        <div className={styles.primaryLinks}>
          <NavLink
            to='/discover'
            icon={<MdSwipe aria-hidden='true' />}
            primary
            description='Swipe through matches'
            onClick={() => trackNavClick('discover')}
          >
            Discover
          </NavLink>
          <NavLink
            to='/search'
            icon={<MdSearch aria-hidden='true' />}
            description='Filter and browse all pets'
            onClick={() => trackNavClick('search')}
          >
            Search
          </NavLink>
          {isAuthenticated && (
            <NavLink
              to='/favorites'
              icon={<MdFavorite aria-hidden='true' />}
              onClick={() => trackNavClick('favorites')}
            >
              Favorites
            </NavLink>
          )}
          {isAuthenticated && (
            <NavLink
              to={hasPreferences ? '/match/top-picks' : '/onboarding'}
              icon={<MdStar aria-hidden='true' />}
              description='Pets matched to your preferences'
              onClick={() => trackNavClick('top_picks')}
            >
              Top Picks
            </NavLink>
          )}
        </div>

        <div className={styles.rightSlot}>
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
        </div>
      </div>
    </nav>
  );
};
