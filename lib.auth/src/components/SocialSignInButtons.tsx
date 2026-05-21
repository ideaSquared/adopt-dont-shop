import React, { useState } from 'react';
import { Alert } from '@adopt-dont-shop/lib.components';
import * as styles from './SocialSignInButtons.css';

export type SocialProvider = 'google' | 'apple';

export interface SocialSignInButtonsProps {
  /**
   * Label prefix shown on each button (e.g. "Sign in" or "Sign up")
   */
  actionLabel?: 'Sign in' | 'Sign up' | 'Continue';
  /**
   * Callback invoked when a provider button is clicked.
   * In dev-stub mode, the default handler shows a placeholder notice.
   */
  onProviderSelected?: (provider: SocialProvider) => void;
  /**
   * Whether to show the "or continue with email" divider beneath the buttons.
   * Defaults to true.
   */
  showDivider?: boolean;
}

const GoogleIcon: React.FC = () => (
  <svg
    className={styles.providerIcon}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
    />
  </svg>
);

const AppleIcon: React.FC = () => (
  <svg
    className={styles.providerIcon}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M16.37 12.6c-.03-2.78 2.27-4.11 2.37-4.18-1.29-1.89-3.3-2.15-4.02-2.18-1.71-.17-3.34 1.01-4.21 1.01-.87 0-2.21-.99-3.63-.96-1.87.03-3.6 1.09-4.56 2.76-1.94 3.37-.5 8.36 1.4 11.1.93 1.34 2.04 2.85 3.46 2.79 1.39-.06 1.91-.9 3.59-.9 1.68 0 2.15.9 3.62.87 1.5-.03 2.45-1.36 3.36-2.71 1.06-1.55 1.5-3.06 1.52-3.13-.03-.01-2.92-1.12-2.9-4.47ZM13.6 4.43c.77-.93 1.29-2.22 1.15-3.51-1.11.05-2.46.74-3.26 1.67-.71.82-1.34 2.13-1.17 3.4 1.24.1 2.51-.63 3.28-1.56Z"
    />
  </svg>
);

const PROVIDERS: ReadonlyArray<{ id: SocialProvider; label: string; Icon: React.FC }> = [
  { id: 'google', label: 'Google', Icon: GoogleIcon },
  { id: 'apple', label: 'Apple', Icon: AppleIcon },
];

/**
 * Social sign-in buttons (Google + Apple).
 *
 * This is a development scaffold: clicking a provider does NOT trigger a real
 * OAuth flow. Instead, the component renders a "dev placeholder" notice. A
 * future change will wire these buttons to real OAuth endpoints once the
 * backend supports provider redirect/callback and account linking by verified
 * email.
 */
export const SocialSignInButtons: React.FC<SocialSignInButtonsProps> = ({
  actionLabel = 'Sign in',
  onProviderSelected,
  showDivider = true,
}) => {
  const [stubMessage, setStubMessage] = useState<string | null>(null);

  const handleClick = (provider: SocialProvider) => {
    if (onProviderSelected) {
      onProviderSelected(provider);
      return;
    }
    const friendly = provider === 'google' ? 'Google' : 'Apple';
    setStubMessage(
      `${friendly} sign-in is a dev placeholder. Real OAuth flow is not wired up yet — use the email form below.`
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.buttonGroup} role="group" aria-label="Social sign-in providers">
        {PROVIDERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={styles.providerButton}
            onClick={() => handleClick(id)}
            data-provider={id}
            aria-label={`${actionLabel} with ${label} (dev stub)`}
          >
            <Icon />
            <span>
              {actionLabel} with {label}
            </span>
          </button>
        ))}
      </div>
      {stubMessage && (
        <Alert variant="info" size="sm">
          {stubMessage}
        </Alert>
      )}
      <p className={styles.devNotice}>Dev placeholder — real OAuth flow not yet implemented.</p>
      {showDivider && <div className={styles.divider}>or continue with email</div>}
    </div>
  );
};
