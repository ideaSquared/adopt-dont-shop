import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authService, useAuth } from '@adopt-dont-shop/lib.auth';
import { Alert, Button, FormField, Input, Modal } from '@adopt-dont-shop/lib.components';
import { leaveApp } from '../utils/leave-app';
import * as styles from './account-forms.css';

// The erasure route answers with these codes (services/gateway/src/routes/gdpr.ts);
// apiService surfaces them as the thrown Error's message.
const REFUSAL_MESSAGES: Record<string, string> = {
  credential_verification_failed: 'That password was incorrect. Please try again.',
  two_factor_required: 'Enter the 6-digit code from your authenticator app to continue.',
  last_super_admin:
    'You are the only active super admin. Make someone else a super admin before deleting your account.',
  last_rescue_staff:
    'You are the last staff member of your rescue. Add another staff member before deleting your account.',
};

const GENERIC_FAILURE = 'We could not delete your account. Please try again.';

const refusalMessage = (error: unknown): string =>
  (error instanceof Error && REFUSAL_MESSAGES[error.message]) || GENERIC_FAILURE;

type Credentials = { password: string; twoFactorToken: string };

const EMPTY: Credentials = { password: '', twoFactorToken: '' };

/**
 * GDPR self-service erasure. Re-collects the password (and a TOTP code for 2FA
 * accounts) because the gateway requires step-up re-authentication.
 */
export const DeleteAccountSection = () => {
  const { user, logout } = useAuth();
  const twoFactorEnabled = user?.twoFactorEnabled === true;
  const [isOpen, setIsOpen] = useState(false);
  const [credentials, setCredentials] = useState<Credentials>(EMPTY);
  const [validationError, setValidationError] = useState<string | undefined>();

  const erase = useMutation({
    mutationFn: ({ password, twoFactorToken }: Credentials) =>
      authService.deleteAccount({
        reason: 'User requested account deletion',
        password,
        ...(twoFactorEnabled ? { twoFactorToken } : {}),
      }),
    onSuccess: async () => {
      await logout();
      leaveApp();
    },
  });

  const close = () => {
    if (erase.isPending) {
      return;
    }
    setIsOpen(false);
    setCredentials(EMPTY);
    setValidationError(undefined);
    erase.reset();
  };

  const update = (field: keyof Credentials) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({ ...prev, [field]: event.target.value }));
    setValidationError(undefined);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!credentials.password) {
      setValidationError('Enter your password to confirm.');
      return;
    }
    if (twoFactorEnabled && !credentials.twoFactorToken) {
      setValidationError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    erase.mutate(credentials);
  };

  const errorMessage = validationError ?? (erase.isError ? refusalMessage(erase.error) : undefined);

  return (
    <div className={styles.form}>
      <p className={styles.hint}>
        Permanently delete your account and the personal data we hold about you. This cannot be
        undone.
      </p>
      <div className={styles.actions}>
        <Button variant='danger' onClick={() => setIsOpen(true)}>
          Delete account…
        </Button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title='Delete account?'
        size='sm'
        closeOnEscape={!erase.isPending}
      >
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <p>
            This permanently deletes your account and all associated data. You cannot undo this.
          </p>
          <FormField label='Current password' htmlFor='delete-account-password' required>
            <Input
              id='delete-account-password'
              type='password'
              autoComplete='current-password'
              value={credentials.password}
              onChange={update('password')}
              disabled={erase.isPending}
            />
          </FormField>
          {twoFactorEnabled && (
            <FormField
              label='Two-factor code'
              htmlFor='delete-account-totp'
              required
              description='Enter the 6-digit code from your authenticator app.'
            >
              <Input
                id='delete-account-totp'
                inputMode='numeric'
                autoComplete='one-time-code'
                value={credentials.twoFactorToken}
                onChange={update('twoFactorToken')}
                disabled={erase.isPending}
              />
            </FormField>
          )}
          {errorMessage && <Alert variant='error'>{errorMessage}</Alert>}
          <div className={styles.actions}>
            <Button type='button' variant='secondary' onClick={close} disabled={erase.isPending}>
              Cancel
            </Button>
            <Button
              type='submit'
              variant='danger'
              isLoading={erase.isPending}
              disabled={erase.isPending}
            >
              Delete my account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
