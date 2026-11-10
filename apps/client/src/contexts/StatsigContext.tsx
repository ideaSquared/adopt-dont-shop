import { useAuth } from '@adopt-dont-shop/lib.auth';
import { StatsigWrapper as SharedStatsigWrapper } from '@adopt-dont-shop/lib.feature-flags';
import {
  hasAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from '@adopt-dont-shop/lib.observability';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';
import React, { useEffect, useMemo, useState } from 'react';

type StatsigWrapperProps = {
  children: React.ReactNode;
};

export const StatsigWrapper: React.FC<StatsigWrapperProps> = ({ children }) => {
  const { user } = useAuth();

  // ADS-493: do not load session-replay or auto-capture until the user has
  // accepted analytics. PECR / GDPR require explicit opt-in before we send
  // identifiable behavioural data to a third party. The shared provider only
  // receives the plugins; the consent decision stays here.
  const [analyticsConsent, setHasAnalyticsConsent] = useState<boolean>(() => hasAnalyticsConsent());

  useEffect(() => {
    return subscribeToAnalyticsConsent(setHasAnalyticsConsent);
  }, []);

  const plugins = useMemo(
    () =>
      analyticsConsent ? [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()] : [],
    [analyticsConsent]
  );

  return (
    <SharedStatsigWrapper
      app='client'
      clientKey={import.meta.env.VITE_STATSIG_CLIENT_KEY}
      user={user}
      plugins={plugins}
      loadingLabel='Loading analytics...'
    >
      {children}
    </SharedStatsigWrapper>
  );
};
