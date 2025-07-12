import { StatsigProvider, useClientAsyncInit } from '@statsig/react-bindings';
import { StatsigSessionReplayPlugin } from '@statsig/session-replay';
import { StatsigAutoCapturePlugin } from '@statsig/web-analytics';
import React from 'react';

interface StatsigWrapperProps {
  children: React.ReactNode;
}

export const StatsigWrapper: React.FC<StatsigWrapperProps> = ({ children }) => {
  const { client } = useClientAsyncInit(
    'client-rXmg6Q7MJwqPhWwb4rJUlRlj3iXDvR0P8hxHlkIuX2f',
    { userID: 'a-user' },
    {
      plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()],
    }
  );

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
          Loading analytics...
        </div>
      }
    >
      {children}
    </StatsigProvider>
  );
};
