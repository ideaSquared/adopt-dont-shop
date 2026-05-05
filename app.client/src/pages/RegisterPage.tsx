import { AuthLayout, RegisterForm } from '@adopt-dont-shop/lib.auth';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as styles from './RegisterPage.css';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/check-your-email', { replace: true });
  };

  return (
    <AuthLayout
      title='Create Your Account'
      subtitle='Join thousands of people who have found their perfect pet companion'
      footer={
        <div className={styles.loginPrompt}>
          <p>Already have an account?</p>
          <Link to='/login'>Sign in instead</Link>
        </div>
      }
    >
      <RegisterForm
        onSuccess={handleSuccess}
        requirePhoneNumber={false}
        termsUrl='/terms'
        privacyUrl='/privacy'
      />
    </AuthLayout>
  );
};
