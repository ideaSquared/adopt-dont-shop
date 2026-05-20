import { AuthLayout, LoginForm, useAuth } from '@adopt-dont-shop/lib.auth';
import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as styles from './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const from = location.state?.from?.pathname || '/';

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
      <LoginForm
        onSuccess={handleSuccess}
        showForgotPassword={true}
        onForgotPassword={handleForgotPassword}
      />
    </AuthLayout>
  );
};
