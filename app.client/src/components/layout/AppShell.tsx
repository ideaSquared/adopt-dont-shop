import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { Footer } from '@adopt-dont-shop/lib.components';
import { AppNavbar } from '@/components/navigation/AppNavbar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { DevLoginPanel } from '@/components/dev/DevLoginPanel';
import { SwipeOnboarding } from '@/components/onboarding/SwipeOnboarding';
import { SwipeFloatingButton } from '@/components/ui/SwipeFloatingButton';

const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Main = styled.main`
  flex: 1;
`;

export const AppShell: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <Shell>
      <AppNavbar />
      <Main>
        <Outlet />
      </Main>
      <SwipeFloatingButton />
      <BottomTabBar />
      <DevLoginPanel />
      {showOnboarding && <SwipeOnboarding onClose={() => setShowOnboarding(false)} />}
      <Footer />
    </Shell>
  );
};
