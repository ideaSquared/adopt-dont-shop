import { AuthLayout, LoginForm, SocialSignInButtons, useAuth } from '@adopt-dont-shop/lib.auth';
import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import * as styles from './LoginPage.css';

// ADS-638: callers can pass `?redirect=<path>` to bring the user back to
// where they came from (e.g. a pet details page) so the original action
// can resume after sign-in. We only accept same-origin paths to prevent
// open-redirect abuse — a leading `/` followed by anything other than
// `/` or `\` is required.
const isSafeRedirectPath = (value: string | null): value is string => {
  if (!value) {
    return false;
  }
  if (!value.startsWith('/')) {
    return false;
  }
  // Block protocol-relative URLs like `//evil.com` and back-slash variants.
  if (value.startsWith('//') || value.startsWith('/\\')) {
    return false;
  }
  return true;
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const redirectParam = searchParams.get('redirect');
  const safeRedirect = isSafeRedirectPath(redirectParam) ? redirectParam : null;
  const from = safeRedirect ?? location.state?.from?.pathname ?? '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  const handleSuccess = () => {
    navigate(from, { replace: true });
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <AuthLayout
      title='Welcome Back'
      subtitle='Sign in to your account to continue your adoption journey'
      footer={
        <div className={styles.signupPrompt}>
          <p>Don&apos;t have an account?</p>
          <Link to='/register'>Create a new account</Link>
        </div>
      }
    >
      <SocialSignInButtons actionLabel='Sign in' />
      <LoginForm
        onSuccess={handleSuccess}
        showForgotPassword={true}
        onForgotPassword={handleForgotPassword}
      />
    </AuthLayout>
  );
};
