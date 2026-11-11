import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Footer, InstallPwaBanner, SkipLink } from '@adopt-dont-shop/lib.components';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import { AppNavbar } from '@/components/navigation/AppNavbar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { SwipeOnboarding } from '@/components/onboarding/SwipeOnboarding';
import { SwipeFloatingButton } from '@/components/ui/SwipeFloatingButton';
import { SanctionBannerHost } from '@adopt-dont-shop/lib.auth';
import * as styles from './AppShell.css';

// Pages people read rather than browse: the swipe onboarding would cover them.
const NO_ONBOARDING_PATHS = new Set(['/privacy', '/terms', '/cookies', '/about', '/contact']);
const NO_ONBOARDING_SECTIONS = ['/blog', '/help'];

// The router matches routes case-insensitively and with a trailing slash, so
// compare against the same normalised form.
const normalisePath = (pathname: string): string =>
  pathname.toLowerCase().replace(/\/+$/, '') || '/';

const isReadingPage = (pathname: string): boolean => {
  const path = normalisePath(pathname);
  return (
    NO_ONBOARDING_PATHS.has(path) ||
    NO_ONBOARDING_SECTIONS.some(section => path === section || path.startsWith(`${section}/`))
  );
};

export const AppShell: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const { pathname } = useLocation();
  const offerOnboarding = showOnboarding && !isReadingPage(pathname);

  return (
    <div className={`${styles.shell} ${styles.shellWithBottomNav}`}>
      <SkipLink />
      <header>
        <AppNavbar />
      </header>
      {/* ADS C4-5: dismissible sanction banner sits above the main-content
          target so the SkipLink still bypasses it to '#main-content'. */}
      <SanctionBannerHost />
      <main id='main-content' className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <SwipeFloatingButton />
      <BottomTabBar />
      {offerOnboarding && <SwipeOnboarding onClose={() => setShowOnboarding(false)} />}
      <Footer extraLinks={<ManageCookiesLink />} />
      <InstallPwaBanner appName="Adopt Don't Shop" />
    </div>
  );
};
