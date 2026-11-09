import { AuthLayout, ForgotPasswordForm } from '@adopt-dont-shop/lib.auth';

export const ForgotPasswordPage = () => (
  <AuthLayout title="Reset your password" subtitle="We will email you a link to choose a new one">
    <ForgotPasswordForm loginHref="/login" />
  </AuthLayout>
);
