import React from 'react';
import Navigation from './Navigation';
import * as styles from './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.appLayout}>
      <Navigation />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
};

export default Layout;
