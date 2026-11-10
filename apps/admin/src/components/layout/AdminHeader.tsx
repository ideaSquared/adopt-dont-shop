import React from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Avatar, Button, DropdownMenu } from '@adopt-dont-shop/lib.components';
import { ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react';
import * as styles from './AdminHeader.css';

interface AdminHeaderProps {
  // Opens the off-canvas sidebar drawer on narrow viewports. The trigger is
  // hidden on desktop where the sidebar is always visible.
  onMobileMenuOpen?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) {
      return 'A';
    }
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getUserRole = () => {
    if (!user?.userType) {
      return 'Admin';
    }
    return user.userType.replace('_', ' ');
  };

  return (
    <header className={styles.headerContainer}>
      <div className={styles.mobileMenu}>
        <Button
          variant='outline'
          size='sm'
          onClick={onMobileMenuOpen}
          aria-label='Open navigation menu'
        >
          <Menu size='1em' />
        </Button>
      </div>
      {/* Global search and notifications removed (ADS-744) — both were non-functional dead UI.
          Re-add once product specs an actual search/notifications backend. */}

      <div className={styles.headerActions}>
        <DropdownMenu
          triggerLabel='User menu'
          align='end'
          items={[
            { label: 'Profile', icon: <User size='1em' />, onClick: () => navigate('/account') },
            {
              label: 'Account Settings',
              icon: <Settings size='1em' />,
              onClick: () => navigate('/account'),
            },
            {
              label: 'Sign Out',
              icon: <LogOut size='1em' />,
              onClick: handleLogout,
              danger: true,
              separatorBefore: true,
            },
          ]}
          trigger={
            <button type='button' className={styles.userButton}>
              <Avatar
                size='sm'
                name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
                initials={getInitials(user?.firstName, user?.lastName)}
              />
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {user?.firstName} {user?.lastName}
                </span>
                <span className={styles.userRole}>{getUserRole()}</span>
              </div>
              <ChevronDown size='1em' />
            </button>
          }
        />
      </div>
    </header>
  );
};
