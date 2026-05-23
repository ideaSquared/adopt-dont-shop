import React, { useState } from 'react';
import { SkipLink } from '@adopt-dont-shop/lib.components';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { SanctionBannerHost } from '../SanctionBannerHost';
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
        {/* ADS C4-5: dismissible sanction banner sits above the main-content
            target so the SkipLink still bypasses it to '#main-content'. */}
        <SanctionBannerHost />
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
