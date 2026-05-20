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
  const sdkKey = import.meta.env.VITE_STATSIG_CLIENT_KEY || 'client-dev-key';
  const user = {
    userID: 'app-user',
    email: 'user@app.com',
    custom: {
      app: 'generated-app'
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