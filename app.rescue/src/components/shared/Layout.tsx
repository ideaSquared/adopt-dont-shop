import React from 'react';
import { InstallPwaBanner, SkipLink } from '@adopt-dont-shop/lib.components';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import Navigation from './Navigation';
import * as styles from './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.appLayout}>
      <SkipLink />
      <Navigation />
      <div className={styles.mainColumn}>
        <main id="main-content" className={styles.mainContent} tabIndex={-1}>
          {children}
        </main>
        <footer className={styles.layoutFooter}>
          <ManageCookiesLink />
        </footer>
      </div>
      <InstallPwaBanner appName="Rescue Portal" />
    </div>
  );
};

export default Layout;
