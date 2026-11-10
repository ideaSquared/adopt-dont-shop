import React, { useState } from 'react';
import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@adopt-dont-shop/lib.api';
import { Alert, Button, FormField, Input } from '@adopt-dont-shop/lib.components';
import { z } from 'zod';

import { authService } from '../services/auth-service';
import { NEW_PASSWORD_HINT, NewPasswordSchema } from '../utils/new-password';
import * as styles from './PasswordRecoveryForms.css';

// Shared forgot/reset password forms for the rescue and admin apps (app.client
// keeps its own pages). Both call the same gateway routes the client does:
// POST /api/v1/auth/forgot-password and POST /api/v1/auth/reset-password.

const EmailSchema = z.string().trim().pipe(z.email('Enter a valid email address.'));

// Both gateway limiters run before any account lookup, so a 429 looks the same
// for known and unknown emails and is safe to surface. Any other 4xx gets the
// generic "check your email" answer, so the form can't be used to probe which
// accounts exist; 5xx and network failures are real errors.
export type RequestOutcome =
  | { kind: 'sent'; email: string }
  | { kind: 'rate-limited'; retryAfterSeconds: number | undefined }
  | { kind: 'failed' };

export const classifyFailure = (email: string, err: unknown): RequestOutcome => {
  if (err instanceof ApiError && err.status === 429) {
    return { kind: 'rate-limited', retryAfterSeconds: err.retryAfterSeconds };
  }
  const isClientError =
    (err instanceof ApiError && err.status < 500) ||
    err instanceof ValidationError ||
    err instanceof NotFoundError ||
    err instanceof AuthenticationError ||
    err instanceof AuthorizationError ||
    err instanceof ConflictError;
  return isClientError ? { kind: 'sent', email } : { kind: 'failed' };
};

export const rateLimitMessage = (retryAfterSeconds: number | undefined): string => {
  const wait =
    retryAfterSeconds === undefined
      ? 'a minute'
      : `${retryAfterSeconds} ${retryAfterSeconds === 1 ? 'second' : 'seconds'}`;
  return `You've made too many reset requests. Please wait ${wait} and try again.`;
};

export type ForgotPasswordFormProps = {
  /** Where "Back to sign in" goes. */
  loginHref: string;
};

export const ForgotPasswordForm = ({ loginHref }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();
  const [outcome, setOutcome] = useState<RequestOutcome | undefined>();
  const [isSending, setIsSending] = useState(false);

  if (outcome?.kind === 'sent') {
    return (
      <div className={styles.container}>
        <h2>Check your email</h2>
        <p>
          If an account exists for {outcome.email}, we&apos;ve sent a link to reset your password.
          The link expires in 1 hour.
        </p>
        <a href={loginHref}>Back to sign in</a>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = EmailSchema.safeParse(email);
    if (!parsed.success) {
      setValidationError('Enter a valid email address.');
      return;
    }
    setIsSending(true);
    setOutcome(undefined);
    try {
      await authService.forgotPassword(parsed.data);
      setOutcome({ kind: 'sent', email: parsed.data });
    } catch (err: unknown) {
      setOutcome(classifyFailure(parsed.data, err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form className={styles.container} onSubmit={handleSubmit} noValidate>
      <p>Enter your email address and we&apos;ll send you a link to reset your password.</p>
      <FormField
        label="Email Address"
        htmlFor="forgot-password-email"
        required
        error={validationError}
      >
        <Input
          id="forgot-password-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setValidationError(undefined);
          }}
          disabled={isSending}
        />
      </FormField>
      {outcome?.kind === 'rate-limited' && (
        <Alert variant="error">{rateLimitMessage(outcome.retryAfterSeconds)}</Alert>
      )}
      {outcome?.kind === 'failed' && (
        <Alert variant="error">We could not send the reset link. Please try again.</Alert>
      )}
      <Button type="submit" isLoading={isSending} disabled={isSending}>
        Send reset link
      </Button>
      <a href={loginHref}>Back to sign in</a>
    </form>
  );
};

// The canonical strong-password policy, capped at the gateway's 128 characters.
const ResetSchema = z
  .object({
    password: NewPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type ResetValues = z.infer<typeof ResetSchema>;
type ResetErrors = Partial<Record<keyof ResetValues, string>>;

const toErrors = (error: z.ZodError<ResetValues>): ResetErrors =>
  Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors).map(([field, messages]) => [
      field,
      messages?.[0],
    ])
  );

export type ResetPasswordFormProps = {
  /** The one-time token from the emailed link; null when the link had none. */
  token: string | null;
  /** Where "Sign in" goes after a successful reset. */
  loginHref: string;
};

export const ResetPasswordForm = ({ token, loginHref }: ResetPasswordFormProps) => {
  const [values, setValues] = useState<ResetValues>({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<ResetErrors>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'failed'>('idle');

  if (!token) {
    return (
      <div className={styles.container}>
        <Alert variant="error">
          This reset link is incomplete. Open the link from the email again, or request a new one.
        </Alert>
        <a href={loginHref}>Back to sign in</a>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className={styles.container}>
        <h2>Password updated</h2>
        <p>You can now sign in with your new password.</p>
        <a href={loginHref}>Sign in</a>
      </div>
    );
  }

  const update = (field: keyof ResetValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = ResetSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toErrors(parsed.error));
      return;
    }
    setStatus('saving');
    try {
      await authService.resetPassword(token, parsed.data.password);
      setStatus('done');
    } catch {
      setStatus('failed');
    }
  };

  const isSaving = status === 'saving';

  return (
    <form className={styles.container} onSubmit={handleSubmit} noValidate>
      <FormField
        label="New password"
        htmlFor="reset-password-new"
        required
        description={NEW_PASSWORD_HINT}
        error={errors.password}
      >
        <Input
          id="reset-password-new"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          disabled={isSaving}
        />
      </FormField>
      <FormField
        label="Confirm new password"
        htmlFor="reset-password-confirm"
        required
        error={errors.confirmPassword}
      >
        <Input
          id="reset-password-confirm"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={update('confirmPassword')}
          disabled={isSaving}
        />
      </FormField>
      {status === 'failed' && (
        <Alert variant="error">
          This reset link is invalid or has expired. Request a new one from the sign-in page.
        </Alert>
      )}
      <Button type="submit" isLoading={isSaving} disabled={isSaving}>
        Reset password
      </Button>
    </form>
  );
};
