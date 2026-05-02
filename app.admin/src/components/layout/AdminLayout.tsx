import React, { useState } from 'react';
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
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={styles.mainContent({ sidebarCollapsed })}>
        <AdminHeader sidebarCollapsed={sidebarCollapsed} />
        <div className={styles.contentWrapper}>{children}</div>
      </main>
    </div>
  );
};
