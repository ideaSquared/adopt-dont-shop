import React from 'react';
import styled from 'styled-components';
import Navigation from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

const AppLayout = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${props => props.theme.background.primary};
  width: 100%;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 2rem;
  overflow-x: auto;
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
`;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <AppLayout>
      <Navigation />
      <MainContent>{children}</MainContent>
    </AppLayout>
  );
};

export default Layout;
