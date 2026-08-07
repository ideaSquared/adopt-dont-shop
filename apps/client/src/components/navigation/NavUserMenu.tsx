import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React from 'react';
import { CircleHelp, FileText, LogOut, Settings, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Avatar } from '@adopt-dont-shop/lib.components';
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

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`${styles.triggerButton}${className ? ` ${className}` : ''}`}
          type='button'
          aria-label={`User menu for ${fullName}`}
        >
          <Avatar name={fullName} src={user.profileImageUrl} size='sm' />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.content} sideOffset={8} align='end'>
          <div className={styles.header}>
            <span className={styles.name}>{fullName}</span>
            <span className={styles.email}>{user.email}</span>
          </div>
          <DropdownMenu.Separator className={styles.separator} />
          <DropdownMenu.Item className={styles.item} asChild>
            <Link to='/profile'>
              <User size='1em' />
              Profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.item} asChild>
            <Link to='/applications'>
              <FileText size='1em' />
              My applications
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.item} asChild>
            <Link to='/profile?tab=settings'>
              <Settings size='1em' />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.item} asChild>
            <Link to='/help'>
              <CircleHelp size='1em' />
              Help
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className={styles.separator} />
          <DropdownMenu.Item className={styles.dangerItem} onSelect={handleLogout}>
            <LogOut size='1em' />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
