import React from 'react';
import clsx from 'clsx';

import { header, headerContainer, logo, navigation, navLink } from './Header.css';

export interface HeaderProps {
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = "Adopt Don't Shop",
  className,
  children,
}) => {
  return (
    <header className={clsx(header, className)}>
      <div className={headerContainer}>
        <h1 className={logo}>{title}</h1>
        <nav className={navigation}>
          {children || (
            <>
              <a href='/' className={navLink}>Home</a>
              <a href='/pets' className={navLink}>Find Pets</a>
              <a href='/about' className={navLink}>About</a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

Header.displayName = 'Header';
