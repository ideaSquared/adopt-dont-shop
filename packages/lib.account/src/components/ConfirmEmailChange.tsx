import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Alert, Button } from '@adopt-dont-shop/lib.components';
import { confirmEmailChange } from '../services/email-change-service';
import * as styles from './account-forms.css';

const REFUSAL_MESSAGES: Record<string, string> = {
  invalid_or_expired_token:
    'This link has expired or has already been used. Start the email change again from your account settings.',
  email_in_use: 'That email address now belongs to another account, so your email was not changed.',
};

const GENERIC_FAILURE = 'We could not confirm your new email. Please try again.';

const refusalMessage = (error: unknown): string =>
  (error instanceof Error && REFUSAL_MESSAGES[error.message]) || GENERIC_FAILURE;

export type ConfirmEmailChangeProps = {
  /** The one-time token from the emailed link; null when the link had none. */
  token: string | null;
  /** Where the "Sign in" link goes after a successful change. */
  signInHref: string;
};

/**
 * Landing screen for the link emailed to the new address. Confirms only on a
 * click: email security scanners open links automatically, and a single-use
 * token spent on page load would be gone before the person arrives.
 */
export const ConfirmEmailChange = ({ token, signInHref }: ConfirmEmailChangeProps) => {
  const { user, logout } = useAuth();
  const confirm = useMutation({
    mutationFn: (value: string) => confirmEmailChange(value),
    // Confirming ends every session; drop this browser's one too.
    onSuccess: async () => {
      if (user) {
        await logout();
      }
    },
  });

  if (confirm.isSuccess) {
    return (
      <div className={styles.form}>
        <h1>Email changed</h1>
        <p>Your new email is confirmed. Sign in with it from now on.</p>
        <a href={signInHref}>Sign in</a>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={styles.form}>
        <h1>Confirm your new email</h1>
        <Alert variant='error'>
          This link is incomplete. Open the link from the email again, or start the email change
          again from your account settings.
        </Alert>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <h1>Confirm your new email</h1>
      <p>
        Confirm to start using this address for your account. You will be signed out everywhere.
      </p>
      <div className={styles.actions}>
        <Button
          onClick={() => confirm.mutate(token)}
          isLoading={confirm.isPending}
          disabled={confirm.isPending}
        >
          Confirm new email
        </Button>
      </div>
      {confirm.isError && <Alert variant='error'>{refusalMessage(confirm.error)}</Alert>}
    </div>
  );
};
