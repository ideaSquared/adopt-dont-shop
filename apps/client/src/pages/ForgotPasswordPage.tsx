import { useCountdown } from '@/hooks/useCountdown';
import { useStatsig } from '@/hooks/useStatsig';
import { authService } from '@/services';
import { AuthLayout, classifyFailure, rateLimitMessage } from '@adopt-dont-shop/lib.auth';
import { Alert, Button, Input } from '@adopt-dont-shop/lib.components';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import * as styles from './ForgotPasswordPage.css';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const RESEND_COOLDOWN_SECONDS = 60;
const SERVER_ERROR_MESSAGE = 'Something went wrong on our side. Please try again shortly.';

export const ForgotPasswordPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const { logEvent } = useStatsig();
  const countdown = useCountdown();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const requestReset = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onMutate: () => {
      setError(null);
      // Log password reset attempt — never send PII to analytics
      logEvent('password_reset_requested', 1, {
        has_email: 'true',
      });
    },
    onSuccess: (_result, email) => {
      setSubmittedEmail(email);
      setIsSuccess(true);
      countdown.start(RESEND_COOLDOWN_SECONDS);

      // Log successful request
      logEvent('password_reset_email_sent', 1, {
        has_email: 'true',
      });
    },
    onError: (err: unknown, email) => {
      if (import.meta.env.DEV) {
        console.error('Forgot password error:', err);
      }

      // Log error — never send PII to analytics
      logEvent('password_reset_request_failed', 1, {
        has_email: 'true',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      });

      const outcome = classifyFailure(email, err);

      if (outcome.kind === 'rate-limited') {
        setError(rateLimitMessage(outcome.retryAfterSeconds));
        countdown.start(outcome.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
        return;
      }
      if (outcome.kind === 'failed') {
        setError(SERVER_ERROR_MESSAGE);
        return;
      }
      setSubmittedEmail(email);
      setIsSuccess(true);
      countdown.start(RESEND_COOLDOWN_SECONDS);
    },
  });
  const isLoading = requestReset.isPending;

  const onSubmit = (data: ForgotPasswordFormData) => requestReset.mutate(data.email);

  const isCoolingDown = countdown.secondsLeft > 0;

  if (isSuccess) {
    return (
      <AuthLayout title='Check Your Email'>
        <div className={styles.successContainer}>
          <p>
            If an account exists for <span className='email-highlight'>{submittedEmail}</span>, you
            will receive password reset instructions shortly.
          </p>
          <p>Please check your email inbox and follow the link to reset your password.</p>

          <div className={styles.infoBox}>
            <p>
              <strong>Didn&apos;t receive the email?</strong>
            </p>
            <p>Check your spam or junk folder before requesting another email.</p>
          </div>

          {error && (
            <Alert variant='error' className={styles.styledAlert}>
              {error}
            </Alert>
          )}

          <Button
            type='button'
            variant='secondary'
            disabled={isLoading || isCoolingDown}
            onClick={() => requestReset.mutate(submittedEmail)}
          >
            {isCoolingDown ? `Send again in ${countdown.secondsLeft}s` : 'Send again'}
          </Button>
          <p role='status'>{countdown.hasElapsed ? 'You can request another email now.' : ''}</p>

          <Link to='/login' className={styles.backToLoginLink}>
            Return to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title='Forgot Password?'
      subtitle="Enter your email address and we'll send you instructions to reset your password."
      footer={
        <Link to='/login' className={styles.backToLoginLink}>
          Back to Login
        </Link>
      }
    >
      {error && (
        <Alert variant='error' className={styles.styledAlert}>
          {error}
        </Alert>
      )}

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        <Input
          label='Email Address'
          type='email'
          placeholder='Enter your email'
          error={errors.email?.message}
          autoFocus
          autoComplete='email'
          {...register('email')}
        />

        <Button
          type='submit'
          size='lg'
          variant='primary'
          disabled={isLoading || isCoolingDown}
          isFullWidth
        >
          {isCoolingDown
            ? `Try again in ${countdown.secondsLeft}s`
            : isLoading
              ? 'Sending Instructions...'
              : 'Send Reset Instructions'}
        </Button>
        <p role='status'>{countdown.hasElapsed ? 'You can try again now.' : ''}</p>
      </form>
    </AuthLayout>
  );
};
