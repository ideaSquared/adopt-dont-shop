import { useOneTimeUrlToken } from '../hooks/useOneTimeUrlToken';
import { AuthLayout } from './AuthLayout';
import { ForgotPasswordForm, ResetPasswordForm } from './PasswordRecoveryForms';

// Route-level pages for the rescue and admin apps' /forgot-password and
// /reset-password routes. Both apps sign in at /login.

const LOGIN_HREF = '/login';

export const ForgotPasswordPage = () => (
  <AuthLayout title="Reset your password" subtitle="We will email you a link to choose a new one">
    <ForgotPasswordForm loginHref={LOGIN_HREF} />
  </AuthLayout>
);

/**
 * Landing page for the password-reset email link. The notifications service
 * points reset links for these apps' users here.
 */
export const ResetPasswordPage = () => {
  const token = useOneTimeUrlToken();

  return (
    <AuthLayout title="Choose a new password">
      <ResetPasswordForm token={token} loginHref={LOGIN_HREF} />
    </AuthLayout>
  );
};
