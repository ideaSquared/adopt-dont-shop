import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@adopt-dont-shop/lib.auth';
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
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
      <button
        className={styles.mobileMenuButton}
        onClick={onMobileMenuOpen}
        aria-label='Open navigation menu'
      >
        <Menu size='1em' />
      </button>
      {/* Global search and notifications removed (ADS-744) — both were non-functional dead UI.
          Re-add once product specs an actual search/notifications backend. */}

      <div className={styles.headerActions}>
        <div className={styles.userMenu}>
          <button
            className={styles.userButton}
            aria-label='User menu'
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className={styles.userAvatar}>{getInitials(user?.firstName, user?.lastName)}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {user?.firstName} {user?.lastName}
              </span>
              <span className={styles.userRole}>{getUserRole()}</span>
            </div>
            <ChevronDown size='1em' />
          </button>

          <div className={styles.dropdownMenu({ isOpen: userMenuOpen })}>
            <button
              className={styles.dropdownItem({ danger: false })}
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/account');
              }}
            >
              <User size='1em' />
              Profile
            </button>
            <button
              className={styles.dropdownItem({ danger: false })}
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/account');
              }}
            >
              <Settings size='1em' />
              Account Settings
            </button>
            <div className={styles.dropdownDivider} />
            <button className={styles.dropdownItem({ danger: true })} onClick={handleLogout}>
              <LogOut size='1em' />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
