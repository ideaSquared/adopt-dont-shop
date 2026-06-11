import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as styles from './AnonymousSwipePaywallModal.css';

export type AnonymousSwipePaywallModalProps = {
  petId: string;
  onSignUp: () => void;
  onLogIn: () => void;
  onDismiss: () => void;
};

/**
 * ADS-625: soft-block paywall shown to anonymous users once they
 * exceed the swipe budget. Modal traps focus on its first button so
 * keyboard users can navigate immediately, and announces itself to
 * screen readers via `role="alertdialog"`.
 */
export const AnonymousSwipePaywallModal: React.FC<AnonymousSwipePaywallModalProps> = ({
  petId,
  onSignUp,
  onLogIn,
  onDismiss,
}) => {
  const navigate = useNavigate();
  const signUpRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    signUpRef.current?.focus();
  }, []);

  const handleSignUp = () => {
    onSignUp();
    navigate(`/register?petId=${encodeURIComponent(petId)}`);
  };

  const handleLogIn = () => {
    onLogIn();
    navigate('/login');
  };

  return (
    <div
      className={styles.backdrop}
      role='alertdialog'
      aria-modal='true'
      aria-labelledby='anon-paywall-title'
      aria-describedby='anon-paywall-desc'
    >
      <div className={styles.card}>
        <h2 id='anon-paywall-title' className={styles.title}>
          Keep swiping
        </h2>
        <p id='anon-paywall-desc' className={styles.subtitle}>
          Sign up free in 10 seconds to keep meeting your matches.
        </p>
        <div className={styles.actions}>
          <button
            ref={signUpRef}
            type='button'
            className={styles.ctaPrimary}
            onClick={handleSignUp}
          >
            Sign up
          </button>
          <button type='button' className={styles.ctaSecondary} onClick={handleLogIn}>
            Log in
          </button>
        </div>
        <button type='button' className={styles.dismiss} onClick={onDismiss} aria-label='Dismiss'>
          ×
        </button>
      </div>
    </div>
  );
};
