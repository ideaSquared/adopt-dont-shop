import React from 'react';
import { Button, Modal } from '@adopt-dont-shop/lib.components';
import { useNavigate } from 'react-router';
import * as styles from './AnonymousSwipePaywallModal.css';

export type AnonymousSwipePaywallModalProps = {
  petId: string;
  onSignUp: () => void;
  onLogIn: () => void;
  onDismiss: () => void;
};

/**
 * ADS-625: soft-block paywall shown to anonymous users once they
 * exceed the swipe budget. The shared Modal traps focus and closes on
 * Escape; the Sign up button takes initial focus so keyboard users can
 * act immediately.
 */
export const AnonymousSwipePaywallModal: React.FC<AnonymousSwipePaywallModalProps> = ({
  petId,
  onSignUp,
  onLogIn,
  onDismiss,
}) => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    onSignUp();
    navigate(`/register?petId=${encodeURIComponent(petId)}`);
  };

  const handleLogIn = () => {
    onLogIn();
    navigate('/login');
  };

  return (
    <Modal isOpen onClose={onDismiss} size='sm' title='Keep swiping'>
      <div className={styles.body}>
        <p className={styles.subtitle}>Sign up free in 10 seconds to keep meeting your matches.</p>
        <div className={styles.actions}>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- primary action of a blocking prompt */}
          <Button autoFocus isRounded onClick={handleSignUp}>
            Sign up
          </Button>
          <Button variant='outline' isRounded onClick={handleLogIn}>
            Log in
          </Button>
        </div>
      </div>
    </Modal>
  );
};
