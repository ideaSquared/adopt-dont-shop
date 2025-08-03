import { createContext, useContext, ReactNode } from 'react';
import { StatsigProvider } from '@statsig/react-bindings';

interface StatsigContextType {
  checkGate: (gateName: string) => boolean;
  getConfig: (configName: string) => any;
  logEvent: (eventName: string, value?: any, metadata?: Record<string, any>) => void;
}

const StatsigContext = createContext<StatsigContextType | null>(null);

export const useStatsigInternal = () => {
  const context = useContext(StatsigContext);
  if (!context) {
    throw new Error('useStatsigInternal must be used within StatsigWrapper');
  }
  return context;
};

interface StatsigWrapperProps {
  children: ReactNode;
}

export const StatsigWrapper = ({ children }: StatsigWrapperProps) => {
  // For rescue app, we'll use a simplified A/B testing setup
  const sdkKey = import.meta.env.VITE_STATSIG_CLIENT_KEY;
  
  // If no valid SDK key is provided, just render children without Statsig
  if (!sdkKey || sdkKey === 'client-rescue-dev-key') {
    console.warn('Statsig SDK key not configured, running without feature flags');
    return (
      <StatsigInnerWrapper>
        {children}
      </StatsigInnerWrapper>
    );
  }

  const user = {
    userID: 'rescue-staff',
    email: 'rescue@adopt-dont-shop.com',
    custom: {
      app: 'rescue'
    }
  };

  return (
    <StatsigProvider sdkKey={sdkKey} user={user}>
      <StatsigInnerWrapper>
        {children}
      </StatsigInnerWrapper>
    </StatsigProvider>
  );
};

interface StatsigInnerWrapperProps {
  children: ReactNode;
}

const StatsigInnerWrapper = ({ children }: StatsigInnerWrapperProps) => {
  // Simplified implementation for now
  const value: StatsigContextType = {
    checkGate: () => false,
    getConfig: () => ({}),
    logEvent: () => {},
  };

  return (
    <StatsigContext.Provider value={value}>
      {children}
    </StatsigContext.Provider>
  );
};
