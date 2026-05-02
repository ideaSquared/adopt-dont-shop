import React from 'react';
import { MdClose, MdFavorite, MdPerson } from 'react-icons/md';
import { Link } from 'react-router-dom';
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
        return 'add pets to your favorites';
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
        return <MdFavorite />;
      default:
        return <MdPerson />;
    }
  };

  return (
    <div
      className={styles.modalOverlay({ isOpen })}
      onClick={onClose}
      role='button'
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onClose();
      }}
    >
      <div
        className={styles.modalContent({ isOpen })}
        onClick={e => e.stopPropagation()}
        role='presentation'
      >
        <button className={styles.closeButton} onClick={onClose}>
          <MdClose />
        </button>

        <div className={styles.icon}>{getActionIcon()}</div>

        <h2 className={styles.title}>Join Adopt Don&apos;t Shop</h2>

        <p className={styles.message}>
          To {getActionMessage()}, you&apos;ll need to create an account or sign in. It&apos;s free
          and helps us find you the perfect pet match!
        </p>

        <div className={styles.buttonGroup}>
          <Link className={styles.primaryButton} to='/register'>
            <MdPerson />
            Create Account
          </Link>

          <Link className={styles.secondaryButton} to='/login'>
            Sign In
          </Link>

          <button className={styles.skipButton} type='button' onClick={onClose}>
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
};
