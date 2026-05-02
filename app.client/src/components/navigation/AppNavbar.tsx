import React from 'react';
import { MdChat, MdFavorite, MdNotifications, MdSearch, MdSwipe } from 'react-icons/md';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useChat } from '@/contexts/ChatContext';
import { useNotifications } from '@/contexts/NotificationsContext';
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

  return (
    <nav className={`${styles.navbarContainer}${className ? ` ${className}` : ''}`}>
      <div className={styles.navContent}>
        <Link className={styles.logo} to='/'>
          <span className={styles.logoIcon} aria-hidden='true'>
            🐾
          </span>
          Adopt Don&apos;t Shop
        </Link>

        <div className={styles.primaryLinks}>
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
