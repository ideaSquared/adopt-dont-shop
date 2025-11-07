import { ReactNode } from 'react';
import { AuthProvider } from '@adopt-dont-shop/lib-auth';

interface AppWithAuthProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides AuthProvider for rescue app
 */
export const AppWithAuth = ({ children }: AppWithAuthProps) => {
  return (
    <AuthProvider
      allowedUserTypes={['rescue_staff']}
      appType='rescue'
    >
      {children}
    </AuthProvider>
  );
};
