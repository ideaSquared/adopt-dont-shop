import React, { useState } from 'react';
import styled, { css, DefaultTheme } from 'styled-components';
import { Avatar } from '../ui/Avatar';

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

const getVariantStyles = (variant: NavbarVariant, theme: DefaultTheme) => {
  const variants = {
    default: css`
      background-color: ${theme.colors.neutral[50]};
      border-bottom: 1px solid ${theme.colors.neutral[200]};
    `,
    transparent: css`
      background-color: transparent;
      border-bottom: none;
    `,
    solid: css`
      background-color: ${theme.colors.primary[500]};
      border-bottom: none;

      * {
        color: ${theme.colors.neutral[50]} !important;
      }
    `,
  };
  return variants[variant];
};

const StyledNavbar = styled.nav<{
  $variant: NavbarVariant;
  $fixed: boolean;
  $shadow: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${({ theme }) => theme.spacing.lg};
  height: 64px;
  z-index: 100;
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ $variant, theme }) => getVariantStyles($variant, theme)}

  ${({ $fixed }) =>
    $fixed &&
    css`
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
    `}

  ${({ $shadow }) =>
    $shadow &&
    css`
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    `}

  @media (max-width: 768px) {
    padding: 0 ${({ theme }) => theme.spacing.md};
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.colors.neutral[900]};
  text-decoration: none;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

const NavItems = styled.div<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    background-color: ${({ theme }) => theme.colors.neutral[50]};
    border-bottom: 1px solid ${({ theme }) => theme.colors.neutral[200]};
    padding: ${({ theme }) => theme.spacing.md};
    gap: ${({ theme }) => theme.spacing.md};
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: ${({ $isOpen }) => ($isOpen ? 'flex' : 'none')};
  }
`;

const NavItem = styled.a<{ $active: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary[500] : theme.colors.neutral[700]};
  text-decoration: none;
  font-weight: ${({ theme, $active }) =>
    $active ? theme.typography.weight.medium : theme.typography.weight.normal};
  border-radius: ${({ theme }) => theme.spacing.xs};
  transition: all ${({ theme }) => theme.transitions.fast};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};

  &:hover {
    background-color: ${({ theme, $disabled }) =>
      $disabled ? 'transparent' : theme.colors.neutral[100]};
    color: ${({ theme, $disabled }) => ($disabled ? 'inherit' : theme.colors.primary[500])};
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const UserMenuContainer = styled.div`
  position: relative;
`;

const UserMenuTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background: none;
  border: none;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.spacing.sm};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.neutral[100]};
  }
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  @media (max-width: 768px) {
    display: none;
  }
`;

const UserName = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.neutral[900]};
`;

const UserEmail = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.neutral[600]};
`;

const UserMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${({ theme }) => theme.colors.neutral[50]};
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.spacing.sm};
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  z-index: 1000;
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const UserMenuAction = styled.button<{ $divider: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.neutral[700]};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.neutral[50]};
  }

  ${({ $divider, theme }) =>
    $divider &&
    css`
      border-top: 1px solid ${theme.colors.neutral[200]};
    `}
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.neutral[700]};

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
  }
`;

const MenuIcon = styled.div<{ $isOpen: boolean }>`
  width: 24px;
  height: 24px;
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: currentColor;
    transition: all ${({ theme }) => theme.transitions.fast};
  }

  &::before {
    top: ${({ $isOpen }) => ($isOpen ? '50%' : '6px')};
    transform: ${({ $isOpen }) => ($isOpen ? 'translateY(-50%) rotate(45deg)' : 'none')};
  }

  &::after {
    bottom: ${({ $isOpen }) => ($isOpen ? '50%' : '6px')};
    transform: ${({ $isOpen }) => ($isOpen ? 'translateY(50%) rotate(-45deg)' : 'none')};
  }

  ${({ $isOpen }) =>
    !$isOpen &&
    css`
      &::before {
        box-shadow: 0 8px 0 currentColor;
      }
    `}
`;

export const Navbar: React.FC<NavbarProps> = ({
  brand,
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
    <StyledNavbar
      $variant={variant}
      $fixed={fixed}
      $shadow={shadow}
      className={className}
      data-testid={dataTestId}
    >
      <Brand onClick={handleBrandClick}>
        {brandHref ? (
          <a href={brandHref} style={{ textDecoration: 'none', color: 'inherit' }}>
            {brand}
          </a>
        ) : (
          brand
        )}
      </Brand>

      {items.length > 0 && (
        <NavItems $isOpen={mobileMenuOpen}>
          {items.map((item, index) => (
            <NavItem
              key={index}
              href={item.href}
              $active={!!item.active}
              $disabled={!!item.disabled}
              onClick={e => {
                if (item.onClick) {
                  e.preventDefault();
                  handleNavItemClick(item);
                }
              }}
            >
              {item.icon && item.icon}
              {item.label}
            </NavItem>
          ))}
        </NavItems>
      )}

      <RightSection>
        {rightActions}

        {showUserMenu && user && (
          <UserMenuContainer>
            <UserMenuTrigger onClick={toggleUserMenu}>
              <Avatar src={user.avatar} size='sm' />
              <UserInfo>
                <UserName>{user.name}</UserName>
                {user.email && <UserEmail>{user.email}</UserEmail>}
              </UserInfo>
            </UserMenuTrigger>

            <UserMenu $isOpen={userMenuOpen}>
              {userMenuActions.map((action, index) => (
                <UserMenuAction
                  key={index}
                  $divider={!!action.divider}
                  onClick={() => handleUserMenuAction(action)}
                >
                  {action.icon && action.icon}
                  {action.label}
                </UserMenuAction>
              ))}
            </UserMenu>
          </UserMenuContainer>
        )}

        {items.length > 0 && (
          <MobileMenuButton onClick={toggleMobileMenu} aria-label='Toggle mobile menu'>
            <MenuIcon $isOpen={mobileMenuOpen} />
          </MobileMenuButton>
        )}
      </RightSection>
    </StyledNavbar>
  );
};
