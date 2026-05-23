import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Footer, InstallPwaBanner, SkipLink } from '@adopt-dont-shop/lib.components';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import { AppNavbar } from '@/components/navigation/AppNavbar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { SwipeOnboarding } from '@/components/onboarding/SwipeOnboarding';
import { SwipeFloatingButton } from '@/components/ui/SwipeFloatingButton';
import * as styles from './AppShell.css';

export const AppShell: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);

  return (
    <div className={styles.shell}>
      <SkipLink />
      <header>
        <AppNavbar />
      </header>
      <main id='main-content' className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <SwipeFloatingButton />
      <BottomTabBar />
      {showOnboarding && <SwipeOnboarding onClose={() => setShowOnboarding(false)} />}
      <Footer extraLinks={<ManageCookiesLink />} />
      <InstallPwaBanner appName="Adopt Don't Shop" />
    </div>
  );
};
