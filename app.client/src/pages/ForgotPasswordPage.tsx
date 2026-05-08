import { useStatsig } from '@/hooks/useStatsig';
import { authService } from '@/services';
import { Alert, Button, Card, Input } from '@adopt-dont-shop/lib.components';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import * as styles from './ForgotPasswordPage.css';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const { logEvent } = useStatsig();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Log password reset attempt
      logEvent('password_reset_requested', 1, {
        email: data.email,
      });

      await authService.forgotPassword(data.email);

      // Always show success message (security best practice - don't reveal if email exists)
      setSubmittedEmail(data.email);
      setIsSuccess(true);

      // Log successful request
      logEvent('password_reset_email_sent', 1, {
        email: data.email,
      });
    } catch (err: unknown) {
      console.error('Forgot password error:', err);

      // Log error
      logEvent('password_reset_request_failed', 1, {
        email: data.email,
        error_message: err instanceof Error ? err.message : 'Unknown error',
      });

      // For security, still show success even on error (don't reveal if email exists)
      // However, if there's a rate limit or server error, we should show that
      const error = err as Error & { response?: { status?: number; data?: { message?: string } } };

      if (error.response?.status === 429) {
        setError('Too many requests. Please try again later.');
      } else if (error.response?.status && error.response.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        // Don't reveal whether email exists - show success
        setSubmittedEmail(data.email);
        setIsSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.container}>
        <Card className={styles.forgotPasswordCard}>
          <div className={styles.successContainer}>
            <h2>Check Your Email</h2>
            <p>
              If an account exists for <span className='email-highlight'>{submittedEmail}</span>,
              you will receive password reset instructions shortly.
            </p>
            <p>Please check your email inbox and follow the link to reset your password.</p>

            <div className={styles.infoBox}>
              <p>
                <strong>Didn&apos;t receive the email?</strong>
              </p>
              <p>Check your spam folder or wait a few minutes before trying again.</p>
            </div>

            <Link to='/login' className={styles.backToLoginLink}>
              Return to Login
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.forgotPasswordCard}>
        <div className={styles.header}>
          <h1>Forgot Password?</h1>
          <p>
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </p>
        </div>

        {error && (
          <Alert variant='error' className={styles.styledAlert}>
            {error}
          </Alert>
        )}

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.formGroup}>
            <Input
              label='Email Address'
              type='email'
              placeholder='Enter your email'
              error={errors.email?.message}
              autoFocus
              {...register('email')}
            />
          </div>

          <Button type='submit' size='lg' variant='primary' disabled={isLoading} isFullWidth>
            {isLoading ? 'Sending Instructions...' : 'Send Reset Instructions'}
          </Button>
        </form>

        <Link to='/login' className={styles.backToLoginLink}>
          Back to Login
        </Link>
      </Card>
    </div>
  );
};
