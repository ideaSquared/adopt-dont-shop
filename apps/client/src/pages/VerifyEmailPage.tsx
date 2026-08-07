import { authService } from '@/services';
import { Alert, Button, Card } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import * as styles from './VerifyEmailPage.css';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // Capture the single-use token ONCE, then strip it from the address bar
  // (ADS-1012) — held in state so the URL rewrite doesn't pull it out from
  // under the verify effect. Previously the strip lived inside the async
  // verify call, so it ran after the token had already sat in the URL (and
  // been observable) through render.
  const [token] = useState(() => searchParams.get('token'));

  useEffect(() => {
    if (searchParams.has('token')) {
      const next = new URLSearchParams(searchParams);
      next.delete('token');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // ADS-375: tokens are single-use, so we must not let StrictMode's dev
  // double-invoke (or any re-render that re-runs the effect) call
  // verifyEmail twice — the second call would burn an already-consumed
  // token and the user sees a spurious "error" state. The ref keys on
  // token so a genuinely-different token (very rare) is still verified.
  const verifiedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided');
      return;
    }

    // StrictMode / fast re-render guard.
    if (verifiedTokenRef.current === token) {
      return;
    }
    verifiedTokenRef.current = token;

    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    const verifyEmail = async () => {
      try {
        // Token is stripped from the address bar by the dedicated effect above
        // (ADS-1012); no need to touch history here.
        await authService.verifyEmail(token);
        if (cancelled) {
          return;
        }
        setStatus('success');

        // Redirect to login after 3 seconds
        redirectTimer = setTimeout(() => {
          navigate('/login?verified=true');
        }, 3000);
      } catch (error) {
        if (cancelled) {
          return;
        }
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

    return () => {
      cancelled = true;
      if (redirectTimer !== undefined) {
        clearTimeout(redirectTimer);
      }
    };
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
              <p>Email verified. You can now access all features of Adopt Don't Shop.</p>
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
                <div className={styles.resendAlert}>
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
                <div className={styles.resendAlert}>
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
