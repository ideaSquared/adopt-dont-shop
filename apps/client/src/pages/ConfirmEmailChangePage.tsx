import { ConfirmEmailChange } from '@adopt-dont-shop/lib.account';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Landing page for the email-change link. Every user type's link points at
 * this app (the notifications service's FRONTEND_URL), as password resets do.
 */
export const ConfirmEmailChangePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Capture the single-use token once, then strip it from the address bar
  // (ADS-1012), as VerifyEmailPage and ResetPasswordPage do.
  const [token] = useState(() => searchParams.get('token'));

  useEffect(() => {
    if (searchParams.has('token')) {
      const next = new URLSearchParams(searchParams);
      next.delete('token');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return <ConfirmEmailChange token={token} signInHref='/login' />;
};
