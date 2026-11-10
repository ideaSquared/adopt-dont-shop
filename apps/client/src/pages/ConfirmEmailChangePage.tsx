import { ConfirmEmailChange } from '@adopt-dont-shop/lib.account';
import { useOneTimeUrlToken } from '@adopt-dont-shop/lib.auth';
import React from 'react';

/**
 * Landing page for the email-change link. Every user type's link points at
 * this app (the notifications service's FRONTEND_URL), as password resets do.
 */
export const ConfirmEmailChangePage: React.FC = () => {
  // Capture the single-use token once, then strip it from the address bar
  // (ADS-1012), as VerifyEmailPage and ResetPasswordPage do.
  const token = useOneTimeUrlToken();

  return <ConfirmEmailChange token={token} signInHref='/login' />;
};
