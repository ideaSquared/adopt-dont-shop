import { AuthLayout, ResetPasswordForm } from '@adopt-dont-shop/lib.auth';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Landing page for the password-reset email link. The notifications service
 * points reset links for this app's users here.
 */
export const ResetPasswordPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Capture the single-use token once, then strip it from the address bar
  // (ADS-1012), as app.client's reset page does.
  const [token] = useState(() => searchParams.get('token'));

  useEffect(() => {
    if (searchParams.has('token')) {
      const next = new URLSearchParams(searchParams);
      next.delete('token');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <AuthLayout title='Choose a new password'>
      <ResetPasswordForm token={token} loginHref='/login' />
    </AuthLayout>
  );
};
