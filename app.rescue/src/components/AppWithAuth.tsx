import { ReactNode } from 'react';
import { AuthProvider } from '@adopt-dont-shop/lib-auth';
import { useStatsigInternal } from '../contexts/StatsigContext';

interface AppWithAuthProps {
  children: ReactNode;
}

/**
 * Wrapper component that integrates AuthProvider with Statsig for rescue app
 */
export const AppWithAuth = ({ children }: AppWithAuthProps) => {
  const { logEvent } = useStatsigInternal();

  const handleAuthEvent = (event: string, data?: Record<string, unknown>) => {
    logEvent(event, 1, data);
  };

  return (
    <AuthProvider
      allowedUserTypes={['rescue_staff']}
      appType='rescue'
      onAuthEvent={handleAuthEvent}
    >
      {children}
    </AuthProvider>
  );
};
