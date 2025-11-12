import { StatsigProvider, useClientAsyncInit } from '@statsig/react-bindings';
import React, { useMemo } from 'react';
import { useAuth } from '@adopt-dont-shop/lib-auth';

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
        app: 'rescue',
        userType: user?.userType,
        rescueId: user?.rescueId,
        isAuthenticated: !!user,
      },
    }),
    [user]
  );

  const { client } = useClientAsyncInit(statsigClientKey || 'client-invalid-key', statsigUser);

  return (
    <StatsigProvider
      client={client}
      loadingComponent={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontSize: '18px',
            color: '#666',
          }}
        >
          Loading...
        </div>
      }
    >
      {children}
    </StatsigProvider>
  );
};
