import { authService } from '@/services';
import { Alert, Button, Card } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as styles from './VerifyEmailPage.css';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('No verification token provided');
        return;
      }

      try {
        // Strip the token from browser history before the response arrives
        // so it doesn't linger in address bar, history, or referer headers.
        window.history.replaceState(null, '', window.location.pathname);
        await authService.verifyEmail(token);
        setStatus('success');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login?verified=true');
        }, 3000);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Verification failed';

        if (message.includes('expired')) {
          setStatus('expired');
          setErrorMessage('Your verification link has expired. Please request a new one.');
        } else {
          setStatus('error');
          setErrorMessage(message);
        }
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendEmail = async () => {
    try {
      setIsResending(true);
      setResendSuccess(false);
      await authService.resendVerificationEmail();
      setResendSuccess(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to resend verification email'
      );
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <div className={styles.iconContainer}>⏳</div>
            <div className={styles.header}>
              <h1>Verifying Your Email</h1>
              <p>Please wait while we verify your email address...</p>
            </div>
            <div className={styles.loadingSpinner} />
          </>
        );

      case 'success':
        return (
          <>
            <div className={styles.iconContainer}>✅</div>
            <div className={styles.header}>
              <h1>Email Verified!</h1>
              <p>
                Your email has been successfully verified. You can now access all features of Adopt
                Don't Shop.
              </p>
            </div>
            <Alert variant='success'>Verification successful! Redirecting to login...</Alert>
            <div className={styles.buttonGroup}>
              <Button onClick={() => navigate('/login')}>Go to Login</Button>
            </div>
          </>
        );

      case 'expired':
        return (
          <>
            <div className={styles.iconContainer}>⏰</div>
            <div className={styles.header}>
              <h1>Link Expired</h1>
              <p>Your verification link has expired. Verification links are valid for 24 hours.</p>
            </div>
            <Alert variant='warning'>{errorMessage}</Alert>
            <div className={styles.resendSection}>
              <p>Don't worry! You can request a new verification email.</p>
              <Button onClick={handleResendEmail} disabled={isResending} isFullWidth>
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              {resendSuccess && (
                <div style={{ marginTop: '1rem' }}>
                  <Alert variant='success'>Verification email sent! Please check your inbox.</Alert>
                </div>
              )}
            </div>
            <div className={styles.buttonGroup}>
              <Button variant='secondary' onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </div>
          </>
        );

      case 'error':
        return (
          <>
            <div className={styles.iconContainer}>❌</div>
            <div className={styles.header}>
              <h1>Verification Failed</h1>
              <p>We couldn't verify your email address.</p>
            </div>
            <Alert variant='error'>{errorMessage}</Alert>
            <div className={styles.resendSection}>
              <p>You can try requesting a new verification email.</p>
              <Button onClick={handleResendEmail} disabled={isResending} isFullWidth>
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              {resendSuccess && (
                <div style={{ marginTop: '1rem' }}>
                  <Alert variant='success'>Verification email sent! Please check your inbox.</Alert>
                </div>
              )}
            </div>
            <div className={styles.buttonGroup}>
              <Link to='/login'>
                <Button variant='secondary' isFullWidth>
                  Back to Login
                </Button>
              </Link>
              <Link to='/help'>
                <Button variant='ghost' isFullWidth>
                  Contact Support
                </Button>
              </Link>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.verifyEmailCard}>{renderContent()}</Card>
    </div>
  );
};

export default VerifyEmailPage;
