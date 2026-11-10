import { authService } from '@/services';
import { AuthLayout } from '@adopt-dont-shop/lib.auth';
import { Alert, Button, toast } from '@adopt-dont-shop/lib.components';
import { useMutation } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';
import * as styles from './CheckYourEmailPage.css';

export const CheckYourEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const resend = useMutation({
    mutationFn: () => authService.resendVerificationEmail(),
    onSuccess: () => {
      toast.success('Verification email sent! Please check your inbox.');
    },
  });

  const resendError = resend.error
    ? resend.error.message || 'Failed to resend verification email'
    : '';

  return (
    <AuthLayout
      title='Check Your Email'
      subtitle="We've sent a verification link to your email address. Click the link to activate your account and access all features."
    >
      <div className={styles.iconContainer} aria-hidden='true'>
        <Mail size='1em' />
      </div>

      <Alert variant='info'>
        The link expires after 24 hours. Check your spam folder if you don't see it.
      </Alert>

      <div className={styles.resendSection}>
        <p>Didn't receive the email?</p>
        <Button onClick={() => resend.mutate()} disabled={resend.isPending} isFullWidth>
          {resend.isPending ? 'Sending...' : 'Resend Verification Email'}
        </Button>
        {resendError && (
          <div className={styles.resendAlert}>
            <Alert variant='error'>{resendError}</Alert>
          </div>
        )}
      </div>

      <div className={styles.buttonGroup}>
        <Button variant='secondary' onClick={() => navigate('/login')} isFullWidth>
          Back to Login
        </Button>
      </div>
    </AuthLayout>
  );
};
