import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import * as styles from './PublicAuthLayout.css';

export const PublicAuthLayout: React.FC = () => {
  const location = useLocation();
  const onLogin = location.pathname.startsWith('/login');
  const switchTo = onLogin ? '/register' : '/login';
  const switchLabel = onLogin ? 'Sign up' : 'Log in';

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.logo} to='/'>
          <span className={styles.logoIcon} aria-hidden='true'>
            🐾
          </span>
          Adopt Don&apos;t Shop
        </Link>
        <Link className={styles.switchLink} to={switchTo}>
          {switchLabel}
        </Link>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <ManageCookiesLink />
      </footer>
    </div>
  );
};
