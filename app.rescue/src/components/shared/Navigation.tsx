import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RescueRole, useAuth } from '@adopt-dont-shop/lib.auth';
import { Logo } from '@adopt-dont-shop/lib.components';
import { useChat } from '@/contexts/ChatContext';
import clsx from 'clsx';
import * as styles from './Navigation.css';

type NavItem = {
  path: string;
  label: string;
  icon: string;
  badge?: number;
  /**
   * Roles that should NOT see this item. Other roles (incl. undefined, e.g.
   * platform admins) continue to see it. Keep rules conservative — broader
   * role-based filtering is follow-up work.
   */
  hideForRoles?: ReadonlyArray<RescueRole>;
};

type NavGroup = {
  id: string;
  label: string;
  items: ReadonlyArray<NavItem>;
};

const Navigation: React.FC = () => {
  const location = useLocation();
  const { user, logout, isLoading } = useAuth();
  const { unreadMessageCount } = useChat();

  // Group order is intentional: day-to-day Operations first, then
  // Communication (high-frequency but distinct context), then Admin
  // (lower-frequency configuration & insights).
  const navGroups: ReadonlyArray<NavGroup> = [
    {
      id: 'operations',
      label: 'Operations',
      items: [
        { path: '/', label: 'Dashboard', icon: '📊' },
        { path: '/pets', label: 'Pets', icon: '🐕' },
        { path: '/applications', label: 'Applications', icon: '📋' },
        { path: '/foster', label: 'Foster', icon: '🏠' },
        { path: '/events', label: 'Events', icon: '🗓️' },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      items: [
        {
          path: '/communication',
          label: 'Messages',
          icon: '💬',
          badge: unreadMessageCount,
        },
      ],
    },
    {
      id: 'admin',
      label: 'Admin',
      items: [
        { path: '/staff', label: 'Staff', icon: '👥' },
        {
          path: '/analytics',
          label: 'Analytics',
          icon: '📈',
          // Volunteers don't need Analytics by default — they focus on
          // pet/application work. Admins and staff still see it.
          hideForRoles: [RescueRole.RESCUE_VOLUNTEER],
        },
        { path: '/reports', label: 'Reports', icon: '📑' },
        { path: '/settings', label: 'Settings', icon: '⚙️' },
      ],
    },
  ];

  const isVisible = (item: NavItem): boolean => {
    if (!item.hideForRoles || item.hideForRoles.length === 0) return true;
    if (!user?.role) return true;
    return !item.hideForRoles.includes(user.role);
  };

  const visibleGroups = navGroups
    .map(group => ({ ...group, items: group.items.filter(isVisible) }))
    .filter(group => group.items.length > 0);

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
        <Logo size={32} showWordmark darkBg />
      </div>

      <div className={styles.navList}>
        {visibleGroups.map(group => {
          const headingId = `nav-group-${group.id}`;
          return (
            <section
              key={group.id}
              role="group"
              aria-labelledby={headingId}
              className={styles.navGroup}
            >
              <h2 id={headingId} className={styles.navGroupLabel}>
                {group.label}
              </h2>
              <ul className={styles.navGroupList}>
                {group.items.map(item => {
                  const isActive = location.pathname === item.path;
                  const hasUnread = typeof item.badge === 'number' && item.badge > 0;
                  return (
                    <li key={item.path} className={styles.navItem}>
                      <Link
                        to={item.path}
                        className={clsx(
                          styles.navLink({
                            active: isActive,
                            hasUnread: hasUnread && !isActive,
                          })
                        )}
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
            </section>
          );
        })}
      </div>

      <div className={styles.navFooter}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {getUserInitials(user?.firstName, user?.lastName)}
          </div>
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
