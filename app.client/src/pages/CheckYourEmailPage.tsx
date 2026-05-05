import { authService } from '@/services';
import { Alert, Button, Card } from '@adopt-dont-shop/lib.components';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as styles from './CheckYourEmailPage.css';

export const CheckYourEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  const handleResend = async () => {
    try {
      setIsResending(true);
      setResendSuccess(false);
      setResendError('');
      await authService.resendVerificationEmail();
      setResendSuccess(true);
    } catch (error) {
      setResendError(
        error instanceof Error ? error.message : 'Failed to resend verification email'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.iconContainer}>📧</div>
        <div className={styles.header}>
          <h1>Check Your Email</h1>
          <p>
            We've sent a verification link to your email address. Click the link to activate your
            account and access all features.
          </p>
        </div>

        <Alert variant='info'>
          The link expires after 24 hours. Check your spam folder if you don't see it.
        </Alert>

        <div className={styles.resendSection}>
          <p>Didn't receive the email?</p>
          <Button onClick={handleResend} disabled={isResending} isFullWidth>
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
          {resendSuccess && (
            <div style={{ marginTop: '1rem' }}>
              <Alert variant='success'>Verification email sent! Please check your inbox.</Alert>
            </div>
          )}
          {resendError && (
            <div style={{ marginTop: '1rem' }}>
              <Alert variant='error'>{resendError}</Alert>
            </div>
          )}
        </div>

        <div className={styles.buttonGroup}>
          <Button variant='secondary' onClick={() => navigate('/login')} isFullWidth>
            Back to Login
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CheckYourEmailPage;
