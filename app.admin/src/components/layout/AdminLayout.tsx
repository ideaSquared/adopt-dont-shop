import React, { useState } from 'react';
import styled from 'styled-components';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: #f3f4f6;
`;

const MainContent = styled.main<{ $sidebarCollapsed: boolean }>`
  flex: 1;
  margin-left: ${props => props.$sidebarCollapsed ? '80px' : '280px'};
  margin-top: 80px;
  transition: margin-left 0.3s ease;
  min-height: calc(100vh - 80px);
`;

const ContentWrapper = styled.div`
  padding: 2rem;
  max-width: 1920px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <LayoutContainer>
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <MainContent $sidebarCollapsed={sidebarCollapsed}>
        <AdminHeader sidebarCollapsed={sidebarCollapsed} />
        <ContentWrapper>
          {children}
        </ContentWrapper>
      </MainContent>
    </LayoutContainer>
  );
};
