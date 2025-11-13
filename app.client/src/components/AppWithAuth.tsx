import { ReactNode } from 'react';
import { AuthProvider } from '@adopt-dont-shop/lib.auth';
import { useAnalytics } from '@/contexts/AnalyticsContext';

interface AppWithAuthProps {
  children: ReactNode;
}

/**
 * Wrapper component that integrates AuthProvider with Analytics
 */
export const AppWithAuth = ({ children }: AppWithAuthProps) => {
  const { trackEvent } = useAnalytics();

  const handleAuthEvent = (event: string, data?: Record<string, unknown>) => {
    trackEvent({
      eventType: event,
      ...data,
    } as any);
  };

  return (
    <AuthProvider allowedUserTypes={['adopter']} appType='client' onAuthEvent={handleAuthEvent}>
      {children}
    </AuthProvider>
  );
};
