import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { FiSearch, FiBell, FiUser, FiLogOut, FiSettings, FiChevronDown } from 'react-icons/fi';
import * as styles from './AdminHeader.css';

interface AdminHeaderProps {
  sidebarCollapsed: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    <header className={styles.headerContainer({ sidebarCollapsed })}>
      <div className={styles.searchContainer}>
        <FiSearch className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type='text'
          placeholder='Search users, rescues, or content...'
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.headerActions}>
        <button className={styles.iconButton({ hasNotification: true })} aria-label='Notifications'>
          <FiBell />
        </button>

        <div className={styles.userMenu}>
          <button className={styles.userButton} onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <div className={styles.userAvatar}>{getInitials(user?.firstName, user?.lastName)}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {user?.firstName} {user?.lastName}
              </span>
              <span className={styles.userRole}>{getUserRole()}</span>
            </div>
            <FiChevronDown />
          </button>

          <div className={styles.dropdownMenu({ isOpen: userMenuOpen })}>
            <button
              className={styles.dropdownItem({ danger: false })}
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/account');
              }}
            >
              <FiUser />
              Profile
            </button>
            <button
              className={styles.dropdownItem({ danger: false })}
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/account');
              }}
            >
              <FiSettings />
              Account Settings
            </button>
            <div className={styles.dropdownDivider} />
            <button className={styles.dropdownItem({ danger: true })} onClick={handleLogout}>
              <FiLogOut />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
