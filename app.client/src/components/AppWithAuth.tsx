import { ReactNode } from 'react';
import { AuthProvider } from '@adopt-dont-shop/lib.auth';
import { attachStoredCookieConsent } from '@adopt-dont-shop/lib.legal';
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
    // ADS-497 (slice 5): on first sign-in OR rehydrate, replay the
    // anonymous cookie-banner choice (if any) against the user's
    // account so the audit log captures their decision. Idempotent per
    // (userId, cookiesVersion) — safe on every session event.
    if (event === 'auth_session_authenticated') {
      const userId = typeof data?.user_id === 'string' ? data.user_id : null;
      if (userId) {
        void attachStoredCookieConsent(userId);
      }
    }
  };

  return (
    <AuthProvider allowedUserTypes={['adopter']} appType='client' onAuthEvent={handleAuthEvent}>
      {children}
    </AuthProvider>
  );
};
