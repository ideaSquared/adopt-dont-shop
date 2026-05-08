import { StatsigProvider, useClientAsyncInit } from '@statsig/react-bindings';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useAuth } from '@adopt-dont-shop/lib.auth';

const StatsigLoadingScreen = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 18px;
  color: #666;
`;

interface StatsigWrapperProps {
  children: React.ReactNode;
}

export const StatsigWrapper: React.FC<StatsigWrapperProps> = ({ children }) => {
  const { user } = useAuth();
  const statsigClientKey = import.meta.env.VITE_STATSIG_CLIENT_KEY;

  if (!statsigClientKey) {
    console.error(
      'VITE_STATSIG_CLIENT_KEY is not set. Feature flags will not work. Please add it to your .env file.'
    );
  }

  const statsigUser = useMemo(
    () => ({
      userID: user?.userId || 'anonymous',
      email: user?.email,
      custom: {
        app: 'client',
        userType: user?.userType,
        isAuthenticated: !!user,
      },
    }),
    [user]
  );

  const { client } = useClientAsyncInit(statsigClientKey || 'client-invalid-key', statsigUser, {
    plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()],
  });

  return (
    <StatsigProvider
      client={client}
      loadingComponent={<StatsigLoadingScreen>Loading analytics...</StatsigLoadingScreen>}
    >
      {children}
    </StatsigProvider>
  );
};
