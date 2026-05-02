import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React from 'react';
import {
  MdHelpOutline,
  MdLogout,
  MdOutlineDescription,
  MdOutlineSettings,
  MdPersonOutline,
} from 'react-icons/md';
import { Link, useNavigate } from 'react-router-dom';
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
              <MdPersonOutline />
              Profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.item} asChild>
            <Link to='/applications'>
              <MdOutlineDescription />
              My applications
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.item} asChild>
            <Link to='/profile?tab=settings'>
              <MdOutlineSettings />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.item} asChild>
            <Link to='/help'>
              <MdHelpOutline />
              Help
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className={styles.separator} />
          <DropdownMenu.Item className={styles.dangerItem} onSelect={handleLogout}>
            <MdLogout />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
