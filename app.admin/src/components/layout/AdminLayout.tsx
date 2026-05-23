import React, { useState } from 'react';
import { SkipLink } from '@adopt-dont-shop/lib.components';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import * as styles from './AdminLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className={styles.layoutContainer}>
      <SkipLink />
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={styles.mainContent({ sidebarCollapsed })}>
        <AdminHeader sidebarCollapsed={sidebarCollapsed} />
        <div id='main-content' className={styles.contentWrapper} tabIndex={-1}>
          {children}
        </div>
        <footer className={styles.layoutFooter}>
          <ManageCookiesLink />
        </footer>
      </main>
    </div>
  );
};
