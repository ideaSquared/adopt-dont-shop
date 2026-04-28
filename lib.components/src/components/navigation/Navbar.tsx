import React, { useState } from 'react';
import clsx from 'clsx';

import { Avatar } from '../ui/Avatar';
import {
  navbar,
  brand,
  brandLink,
  navItems,
  navItemsHidden,
  navItemsVisible,
  navItem,
  rightSection,
  userMenuContainer,
  userMenuTrigger,
  userInfo,
  userName,
  userEmail,
  userMenu,
  userMenuHidden,
  userMenuVisible,
  userMenuAction,
  mobileMenuButton,
  menuIcon,
  menuIconClosed,
  menuIconOpen,
} from './Navbar.css';

export type NavbarVariant = 'default' | 'transparent' | 'solid';

export type NavItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export type UserMenuAction = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  divider?: boolean;
};

export type NavbarProps = {
  brand?: React.ReactNode;
  brandHref?: string;
  items?: NavItem[];
  variant?: NavbarVariant;
  fixed?: boolean;
  shadow?: boolean;
  showUserMenu?: boolean;
  user?: {
    name: string;
    avatar?: string;
    email?: string;
  };
  userMenuActions?: UserMenuAction[];
  rightActions?: React.ReactNode;
  onBrandClick?: () => void;
  className?: string;
  'data-testid'?: string;
};

export const Navbar: React.FC<NavbarProps> = ({
  brand: brandContent,
  brandHref,
  items = [],
  variant = 'default',
  fixed = false,
  shadow = true,
  showUserMenu = false,
  user,
  userMenuActions = [],
  rightActions,
  onBrandClick,
  className,
  'data-testid': dataTestId,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleBrandClick = () => {
    if (onBrandClick) {
      onBrandClick();
    }
  };

  const handleBrandKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleBrandClick();
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleNavItemClick = (item: NavItem) => {
    if (!item.disabled) {
      if (item.onClick) {
        item.onClick();
      }
      setMobileMenuOpen(false);
    }
  };

  const handleUserMenuAction = (action: UserMenuAction) => {
    action.onClick();
    setUserMenuOpen(false);
  };

  return (
    <nav
      className={clsx(navbar({ variant, shadow: shadow ? true : false }), className)}
      style={fixed ? { position: 'fixed', top: 0, left: 0, right: 0 } : undefined}
      data-testid={dataTestId}
    >
      <div
        className={brand}
        onClick={handleBrandClick}
        onKeyDown={handleBrandKeyDown}
        role='button'
        tabIndex={0}
      >
        {brandHref ? (
          <a href={brandHref} className={brandLink}>
            {brandContent}
          </a>
        ) : (
          brandContent
        )}
      </div>

      {items.length > 0 && (
        <div className={clsx(navItems, mobileMenuOpen ? navItemsVisible : navItemsHidden)}>
          {items.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className={navItem({
                active: !!item.active,
                disabled: !!item.disabled,
              })}
              onClick={e => {
                if (item.onClick) {
                  e.preventDefault();
                  handleNavItemClick(item);
                }
              }}
            >
              {item.icon && item.icon}
              {item.label}
            </a>
          ))}
        </div>
      )}

      <div className={rightSection}>
        {rightActions}

        {showUserMenu && user && (
          <div className={userMenuContainer}>
            <button className={userMenuTrigger} onClick={toggleUserMenu}>
              <Avatar src={user.avatar} size='sm' />
              <div className={userInfo}>
                <span className={userName}>{user.name}</span>
                {user.email && <span className={userEmail}>{user.email}</span>}
              </div>
            </button>

            <div className={clsx(userMenu, userMenuOpen ? userMenuVisible : userMenuHidden)}>
              {userMenuActions.map((action, index) => (
                <button
                  key={index}
                  className={userMenuAction({ divider: !!action.divider })}
                  onClick={() => handleUserMenuAction(action)}
                >
                  {action.icon && action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {items.length > 0 && (
          <button
            className={mobileMenuButton}
            onClick={toggleMobileMenu}
            aria-label='Toggle mobile menu'
          >
            <div className={clsx(menuIcon, mobileMenuOpen ? menuIconOpen : menuIconClosed)} />
          </button>
        )}
      </div>
    </nav>
  );
};
