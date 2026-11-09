import { useAuth } from '@adopt-dont-shop/lib.auth';
import { StatsigWrapper as SharedStatsigWrapper } from '@adopt-dont-shop/lib.feature-flags';
import React, { useMemo } from 'react';

type StatsigWrapperProps = {
  children: React.ReactNode;
};

export const StatsigWrapper: React.FC<StatsigWrapperProps> = ({ children }) => {
  const { user } = useAuth();
  const extraCustom = useMemo(() => ({ role: user?.userType }), [user?.userType]); // admin or moderator

  return (
    <SharedStatsigWrapper
      app='admin'
      clientKey={import.meta.env.VITE_STATSIG_CLIENT_KEY}
      user={user}
      extraCustom={extraCustom}
    >
      {children}
    </SharedStatsigWrapper>
  );
};
