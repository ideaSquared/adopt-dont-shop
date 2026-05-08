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
      // Until consent is granted we deliberately omit the email so PII does
      // not leave the device. Statsig still gets an opaque userID so feature
      // flags work, but session replay / autocapture stay off.
      userID: user?.userId || 'anonymous',
      email: analyticsConsent ? user?.email : undefined,
      custom: {
        app: 'client',
        userType: user?.userType,
        isAuthenticated: !!user,
      },
    }),
    [user, analyticsConsent]
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
