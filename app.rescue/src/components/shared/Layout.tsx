import React from 'react';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import Navigation from './Navigation';
import * as styles from './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.appLayout}>
      <Navigation />
      <div className={styles.mainColumn}>
        <main className={styles.mainContent}>{children}</main>
        <footer className={styles.layoutFooter}>
          <ManageCookiesLink />
        </footer>
      </div>
    </div>
  );
};

export default Layout;
