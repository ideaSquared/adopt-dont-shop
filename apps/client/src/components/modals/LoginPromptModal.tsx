import React from 'react';
import { Button, Modal } from '@adopt-dont-shop/lib.components';
import { Heart, User } from 'lucide-react';
import { Link } from 'react-router';
import * as styles from './LoginPromptModal.css';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  isOpen,
  onClose,
  action = 'interact with pets',
}) => {
  const getActionMessage = () => {
    switch (action) {
      case 'like':
        return 'add pets to your favourites';
      case 'super_like':
        return 'super like pets';
      case 'pass':
        return 'continue discovering pets';
      case 'info':
        return 'view detailed pet information';
      default:
        return 'interact with pets';
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'like':
      case 'super_like':
        return <Heart size='1em' />;
      default:
        return <User size='1em' />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='sm' title="Join Adopt Don't Shop">
      <div className={styles.content}>
        <div className={styles.icon}>{getActionIcon()}</div>

        <p className={styles.message}>
          To {getActionMessage()}, you&apos;ll need to create an account or sign in. It&apos;s free
          and helps us match you with the right pet.
        </p>

        <div className={styles.buttonGroup}>
          <Link className={styles.primaryButton} to='/register'>
            <User size='1em' />
            Create Account
          </Link>

          <Link className={styles.secondaryButton} to='/login'>
            Sign In
          </Link>

          <Button variant='ghost' size='sm' onClick={onClose}>
            Continue browsing
          </Button>
        </div>
      </div>
    </Modal>
  );
};
