import React, { useState } from 'react';
import { useAuth, usePermissions } from '@adopt-dont-shop/lib.auth';
import type { Permission } from '@adopt-dont-shop/lib.permissions';
import { Logo, NavSidebar, type NavSidebarGroup } from '@adopt-dont-shop/lib.components';
import { useChat } from '@/contexts/ChatContext';
import * as styles from './Navigation.css';

type NavItem = {
  path: string;
  label: string;
  icon: string;
  badge?: number;
  /**
   * If set, the item is shown only when the signed-in user holds at least
   * one of these permissions. Items without `requiresAnyOf` are always shown.
   */
  requiresAnyOf?: ReadonlyArray<Permission>;
};

type NavGroup = {
  id: string;
  label: string;
  items: ReadonlyArray<NavItem>;
};

const Navigation: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const { permissions } = usePermissions();
  const { unreadMessageCount } = useChat();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
          // Volunteers don't have reports.read.rescue and so don't see this.
          requiresAnyOf: ['reports.read.rescue' as Permission],
        },
        { path: '/reports', label: 'Reports', icon: '📑' },
        { path: '/settings', label: 'Settings', icon: '⚙️' },
      ],
    },
  ];

  const isVisible = (item: NavItem): boolean => {
    if (!item.requiresAnyOf || item.requiresAnyOf.length === 0) {
      return true;
    }
    return item.requiresAnyOf.some(p => permissions.includes(p));
  };

  const visibleGroups = navGroups
    .map(group => ({ ...group, items: group.items.filter(isVisible) }))
    .filter(group => group.items.length > 0);

  // Map the permission-filtered groups onto the shared NavSidebar shape.
  // NavSidebar does no filtering, so the visibility decision above is final.
  const groups: NavSidebarGroup[] = visibleGroups.map(group => ({
    id: group.id,
    label: group.label,
    items: group.items.map(item => {
      const base = {
        to: item.path,
        label: item.label,
        icon: item.icon,
        // The root Dashboard link must match exactly, otherwise it would be
        // active on every route.
        end: item.path === '/',
      };
      if (typeof item.badge !== 'number') {
        return base;
      }
      return {
        ...base,
        badge: item.badge,
        badgeAriaLabel: `${item.badge} unread message${item.badge === 1 ? '' : 's'}`,
      };
    }),
  }));

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
    <>
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={styles.mobileMenuButton}
          aria-label="Open navigation menu"
          aria-expanded={isMobileOpen}
          onClick={() => setIsMobileOpen(true)}
        >
          ☰
        </button>
        <Logo size={28} showWordmark darkBg />
      </div>

      <NavSidebar
        groups={groups}
        header={<Logo size={32} showWordmark darkBg />}
        footer={
          <>
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
          </>
        }
        mobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />
    </>
  );
};

export default Navigation;
