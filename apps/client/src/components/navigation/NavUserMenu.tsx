import React from 'react';
import { CircleHelp, FileText, LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Avatar, DropdownMenu } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import * as styles from './NavUserMenu.css';

export type NavUserMenuProps = {
  className?: string;
};

export const NavUserMenu: React.FC<NavUserMenuProps> = ({ className }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  // The Avatar shows these initials when there is no photo; the accessible name must contain
  // the visible text (WCAG 2.5.3).
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  return (
    <DropdownMenu
      triggerLabel={`${initials}, user menu for ${fullName}`}
      align='end'
      trigger={
        <button
          className={`${styles.triggerButton}${className ? ` ${className}` : ''}`}
          type='button'
        >
          <Avatar name={fullName} src={user.profileImageUrl} size='sm' />
        </button>
      }
      header={
        <div className={styles.identity}>
          <span className={styles.name}>{fullName}</span>
          <span className={styles.email}>{user.email}</span>
        </div>
      }
      items={[
        { label: 'Profile', icon: <User size='1em' />, onClick: () => navigate('/profile') },
        {
          label: 'My applications',
          icon: <FileText size='1em' />,
          onClick: () => navigate('/applications'),
        },
        {
          label: 'Settings',
          icon: <Settings size='1em' />,
          onClick: () => navigate('/profile?tab=settings'),
        },
        { label: 'Help', icon: <CircleHelp size='1em' />, onClick: () => navigate('/help') },
        {
          label: 'Log out',
          icon: <LogOut size='1em' />,
          onClick: handleLogout,
          danger: true,
          separatorBefore: true,
        },
      ]}
    />
  );
};
