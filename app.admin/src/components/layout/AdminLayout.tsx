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
  // Off-canvas drawer state for narrow viewports. On desktop the sidebar is
  // always visible and this has no effect (see AdminSidebar.css media query).
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const openMobileSidebar = () => {
    setMobileOpen(true);
  };

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  return (
    <div className={styles.layoutContainer}>
      <SkipLink />
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileSidebar}
      />
      {mobileOpen && (
        <div
          className={styles.mobileBackdrop}
          onClick={closeMobileSidebar}
          aria-hidden='true'
          data-testid='sidebar-backdrop'
        />
      )}
      <main className={styles.mainContent({ sidebarCollapsed })}>
        <AdminHeader sidebarCollapsed={sidebarCollapsed} onMobileMenuOpen={openMobileSidebar} />
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
