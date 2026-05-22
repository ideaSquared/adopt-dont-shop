import {
  hasAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from '@adopt-dont-shop/lib.observability';
import { StatsigProvider, useClientAsyncInit } from '@statsig/react-bindings';
import './StatsigContext.css';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@adopt-dont-shop/lib.auth';

type StatsigWrapperProps = {
  children: React.ReactNode;
};

export const StatsigWrapper: React.FC<StatsigWrapperProps> = ({ children }) => {
  const { user } = useAuth();
  const statsigClientKey = import.meta.env.VITE_STATSIG_CLIENT_KEY;

  if (!statsigClientKey) {
    console.error(
      'VITE_STATSIG_CLIENT_KEY is not set. Feature flags will not work. Please add it to your .env file.'
    );
  }

  // ADS-493: do not load session-replay or auto-capture until the user has
  // accepted analytics. PECR / GDPR require explicit opt-in before we send
  // identifiable behavioural data to a third party.
  const [analyticsConsent, setHasAnalyticsConsent] = useState<boolean>(() => hasAnalyticsConsent());

  useEffect(() => {
    return subscribeToAnalyticsConsent(setHasAnalyticsConsent);
  }, []);

  const statsigUser = useMemo(
    () => ({
      // Email is intentionally omitted regardless of consent — Statsig is
      // a third-party SaaS and the opaque userID is sufficient for flag
      // bucketing. Session replay / autocapture plugins remain gated on
      // analytics consent below.
      userID: user?.userId || 'anonymous',
      custom: {
        app: 'client',
        userType: user?.userType,
        isAuthenticated: !!user,
      },
    }),
    [user]
  );

  const plugins = useMemo(
    () =>
      analyticsConsent ? [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()] : [],
    [analyticsConsent]
  );

  const { client } = useClientAsyncInit(statsigClientKey || 'client-invalid-key', statsigUser, {
    plugins,
  });

  return (
    <StatsigProvider client={client} loadingComponent={<StatsigLoading />}>
      {children}
    </StatsigProvider>
  );
};

const StatsigLoading: React.FC = () => (
  <div className='statsig-loading-fallback'>Loading analytics...</div>
);
