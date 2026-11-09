import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Alert, Button, FormField, Input } from '@adopt-dont-shop/lib.components';
import { z } from 'zod';
import { requestEmailChange, type EmailChangeRequest } from '../services/email-change-service';
import * as styles from './account-forms.css';

const INVALID_EMAIL = 'Enter a valid email address.';
const UNCHANGED_EMAIL = 'This is already your email.';
const MISSING_TOTP = 'Enter the 6-digit code from your authenticator app.';

const REFUSAL_MESSAGES: Record<string, string> = {
  credential_verification_failed: 'That password was incorrect. Please try again.',
  two_factor_required: 'Enter the 6-digit code from your authenticator app to continue.',
  invalid_email: INVALID_EMAIL,
  email_unchanged: UNCHANGED_EMAIL,
};

const GENERIC_FAILURE = 'We could not start the email change. Please try again.';

const refusalMessage = (error: unknown): string =>
  (error instanceof Error && REFUSAL_MESSAGES[error.message]) || GENERIC_FAILURE;

const EmailSchema = z.string().trim().toLowerCase().pipe(z.email(INVALID_EMAIL));

type Values = { newEmail: string; password: string; twoFactorToken: string };

const EMPTY: Values = { newEmail: '', password: '', twoFactorToken: '' };

/**
 * Starts a verified email change: the address only changes once the user
 * follows the link sent to the new address.
 */
export const ChangeEmailForm = () => {
  const { user } = useAuth();
  const twoFactorEnabled = user?.twoFactorEnabled === true;
  const currentEmail = user?.email ?? '';
  const [values, setValues] = useState<Values>(EMPTY);
  const [validationError, setValidationError] = useState<string | undefined>();
  const [sentTo, setSentTo] = useState<string | undefined>();

  const request = useMutation({
    mutationFn: (payload: EmailChangeRequest) => requestEmailChange(payload),
    onSuccess: (_data, payload) => {
      setSentTo(payload.newEmail);
      setValues(EMPTY);
    },
  });

  if (!user) {
    return null;
  }

  const update = (field: keyof Values) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [field]: event.target.value }));
    setValidationError(undefined);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const email = EmailSchema.safeParse(values.newEmail);
    if (!email.success) {
      setValidationError(INVALID_EMAIL);
      return;
    }
    if (email.data === currentEmail.toLowerCase()) {
      setValidationError(UNCHANGED_EMAIL);
      return;
    }
    if (!values.password) {
      setValidationError('Enter your current password.');
      return;
    }
    if (twoFactorEnabled && !values.twoFactorToken) {
      setValidationError(MISSING_TOTP);
      return;
    }
    setSentTo(undefined);
    request.mutate({
      newEmail: email.data,
      password: values.password,
      ...(twoFactorEnabled ? { twoFactorToken: values.twoFactorToken } : {}),
    });
  };

  const errorMessage =
    validationError ?? (request.isError ? refusalMessage(request.error) : undefined);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormField label='New email' htmlFor='change-email-new' required>
        <Input
          id='change-email-new'
          type='email'
          autoComplete='email'
          value={values.newEmail}
          onChange={update('newEmail')}
          disabled={request.isPending}
        />
      </FormField>
      <FormField label='Current password' htmlFor='change-email-password' required>
        <Input
          id='change-email-password'
          type='password'
          autoComplete='current-password'
          value={values.password}
          onChange={update('password')}
          disabled={request.isPending}
        />
      </FormField>
      {twoFactorEnabled && (
        <FormField label='Two-factor code' htmlFor='change-email-totp' required>
          <Input
            id='change-email-totp'
            inputMode='numeric'
            autoComplete='one-time-code'
            value={values.twoFactorToken}
            onChange={update('twoFactorToken')}
            disabled={request.isPending}
          />
        </FormField>
      )}
      <p className={styles.hint}>
        We will email a confirmation link to the new address. Confirming signs you out on all
        devices.
      </p>

      <div className={styles.actions}>
        <Button type='submit' isLoading={request.isPending} disabled={request.isPending}>
          Send confirmation link
        </Button>
      </div>
      {sentTo && (
        <p className={styles.statusMessage} role='status'>
          Check your inbox at {sentTo} for a link to confirm. Your email stays {currentEmail} until
          you confirm.
        </p>
      )}
      {errorMessage && <Alert variant='error'>{errorMessage}</Alert>}
    </form>
  );
};
