import { useAuth } from '@adopt-dont-shop/lib.auth';
import { StatsigWrapper as SharedStatsigWrapper } from '@adopt-dont-shop/lib.feature-flags';
import React from 'react';

type StatsigWrapperProps = {
  children: React.ReactNode;
};

export const StatsigWrapper: React.FC<StatsigWrapperProps> = ({ children }) => {
  const { user } = useAuth();

  return (
    <SharedStatsigWrapper
      app="rescue"
      clientKey={import.meta.env.VITE_STATSIG_CLIENT_KEY}
      user={user}
    >
      {children}
    </SharedStatsigWrapper>
  );
};
