import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useChat } from '@/contexts/ChatContext';
import clsx from 'clsx';
import * as styles from './Navigation.css';

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
    <nav className={styles.mainNavigation}>
      <div className={styles.navHeader}>
        <h2>🏠 Rescue Portal</h2>
      </div>

      <ul className={styles.navList}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const hasUnread = typeof item.badge === 'number' && item.badge > 0;
          return (
            <li key={item.path} className={styles.navItem}>
              <Link
                to={item.path}
                className={clsx(styles.navLink({ active: isActive, hasUnread: hasUnread && !isActive }))}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {hasUnread && (
                  <span
                    className={styles.navBadge}
                    aria-label={`${item.badge} unread message${item.badge === 1 ? '' : 's'}`}
                  >
                    {item.badge! > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className={styles.navFooter}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>{getUserInitials(user?.firstName, user?.lastName)}</div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>
              {user?.firstName} {user?.lastName}
            </span>
            <span className={styles.userRole}>{formatUserRole(user?.userType)}</span>
          </div>
        </div>
        <button className={styles.logoutButton} onClick={handleLogout} disabled={isLoading}>
          {isLoading ? 'Signing Out...' : 'Sign Out'}
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
