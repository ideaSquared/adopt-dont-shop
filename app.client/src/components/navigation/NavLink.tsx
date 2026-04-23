import React from 'react';
import { Link, useLocation, type LinkProps } from 'react-router-dom';
import styled, { css } from 'styled-components';

type StyledLinkProps = {
  $active: boolean;
  $primary: boolean;
  $iconOnly: boolean;
};

const StyledLink = styled(Link)<StyledLinkProps>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme, $iconOnly }) =>
    $iconOnly ? theme.spacing[2] : `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.border.radius.md};
  color: #fff;
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.typography.size.sm};
  transition: background ${({ theme }) => theme.transitions.fast};
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 2px;
  }

  ${({ $active }) =>
    $active &&
    css`
      background: rgba(255, 255, 255, 0.18);
    `}

  ${({ $primary }) =>
    $primary &&
    css`
      background: rgba(255, 255, 255, 0.15);
      font-weight: 600;
    `}

  .nav-icon {
    font-size: 1.25rem;
    display: inline-flex;
  }
`;

export type NavLinkProps = Omit<LinkProps, 'to'> & {
  to: string;
  icon?: React.ReactNode;
  primary?: boolean;
  iconOnly?: boolean;
  children?: React.ReactNode;
};

export const NavLink: React.FC<NavLinkProps> = ({
  to,
  icon,
  primary = false,
  iconOnly = false,
  children,
  ...rest
}) => {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <StyledLink to={to} $active={active} $primary={primary} $iconOnly={iconOnly} {...rest}>
      {icon && <span className='nav-icon'>{icon}</span>}
      {!iconOnly && children}
    </StyledLink>
  );
};
