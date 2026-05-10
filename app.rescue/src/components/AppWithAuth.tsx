import { ReactNode } from 'react';
import { AuthProvider } from '@adopt-dont-shop/lib.auth';
import { attachStoredCookieConsent } from '@adopt-dont-shop/lib.legal';

interface AppWithAuthProps {
  children: ReactNode;
}

// ADS-497 (slice 5): replay an anonymous cookie-banner choice against
// the user's account on first session-auth event. Idempotent per
// (userId, cookiesVersion).
const handleAuthEvent = (event: string, data?: Record<string, unknown>) => {
  if (event !== 'auth_session_authenticated') {
    return;
  }
  const userId = typeof data?.user_id === 'string' ? data.user_id : null;
  if (userId) {
    void attachStoredCookieConsent(userId);
  }
};

/**
 * Wrapper component that provides AuthProvider for rescue app
 */
export const AppWithAuth = ({ children }: AppWithAuthProps) => {
  return (
    <AuthProvider
      allowedUserTypes={['rescue_staff']}
      appType="rescue"
      onAuthEvent={handleAuthEvent}
    >
      {children}
    </AuthProvider>
  );
};
