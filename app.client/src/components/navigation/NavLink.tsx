import React from 'react';
import { Link, useLocation, type LinkProps } from 'react-router-dom';
import * as styles from './NavLink.css';

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
    <Link className={styles.styledLink({ active, primary, iconOnly })} to={to} {...rest}>
      {icon && <span className={styles.navIcon}>{icon}</span>}
      {!iconOnly && children}
    </Link>
  );
};
