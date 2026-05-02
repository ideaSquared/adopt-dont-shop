import React from 'react';
import { MdChat, MdFavoriteBorder, MdOutlineSearch, MdSwipe } from 'react-icons/md';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useChat } from '@/contexts/ChatContext';
import { NavUserMenu } from './NavUserMenu';
import * as styles from './BottomTabBar.css';

type TabDef = {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export const BottomTabBar: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { unreadMessageCount } = useChat();
  const location = useLocation();

  if (!isAuthenticated) {
    return null;
  }

  const tabs: TabDef[] = [
    { to: '/discover', label: 'Discover', icon: <MdSwipe aria-hidden='true' /> },
    { to: '/search', label: 'Search', icon: <MdOutlineSearch aria-hidden='true' /> },
    { to: '/favorites', label: 'Favorites', icon: <MdFavoriteBorder aria-hidden='true' /> },
    {
      to: '/chat',
      label: 'Messages',
      icon: <MdChat aria-hidden='true' />,
      badge: unreadMessageCount,
    },
  ];

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <nav className={styles.bar} aria-label='Primary'>
      <ul className={styles.tabs}>
        {tabs.map(tab => {
          const active = isActive(tab.to);
          const ariaLabel =
            tab.badge && tab.badge > 0 ? `${tab.label} (${tab.badge} unread)` : tab.label;
          return (
            <li className={styles.tabItem} key={tab.to}>
              <Link
                className={styles.tabLink({ active })}
                to={tab.to}
                aria-label={ariaLabel}
                aria-current={active ? 'page' : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className={styles.badgeOverlay}>
                    <Badge variant='count' max={99}>
                      {tab.badge}
                    </Badge>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
        <li className={styles.meTab}>
          <NavUserMenu />
        </li>
      </ul>
    </nav>
  );
};
