import { AuthLayout, ResetPasswordForm, useOneTimeUrlToken } from '@adopt-dont-shop/lib.auth';

/**
 * Landing page for the password-reset email link. The notifications service
 * points reset links for this app's users here.
 */
export const ResetPasswordPage = () => {
  const token = useOneTimeUrlToken();

  return (
    <AuthLayout title="Choose a new password">
      <ResetPasswordForm token={token} loginHref="/login" />
    </AuthLayout>
  );
};
