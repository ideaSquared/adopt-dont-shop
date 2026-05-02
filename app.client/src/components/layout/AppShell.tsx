import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Footer } from '@adopt-dont-shop/lib.components';
import { AppNavbar } from '@/components/navigation/AppNavbar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { SwipeOnboarding } from '@/components/onboarding/SwipeOnboarding';
import { SwipeFloatingButton } from '@/components/ui/SwipeFloatingButton';
import * as styles from './AppShell.css';

export const AppShell: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <div className={styles.shell}>
      <AppNavbar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <SwipeFloatingButton />
      <BottomTabBar />
      {showOnboarding && <SwipeOnboarding onClose={() => setShowOnboarding(false)} />}
      <Footer />
    </div>
  );
};
