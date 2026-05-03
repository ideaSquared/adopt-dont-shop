import React from 'react';
import { MdClose, MdFavorite, MdInfo, MdStar } from 'react-icons/md';
import * as styles from './SwipeControls.css';

interface SwipeControlsProps {
  onAction: (action: 'pass' | 'info' | 'like' | 'super_like') => void;
  disabled?: boolean;
  className?: string;
}

export const SwipeControls: React.FC<SwipeControlsProps> = ({
  onAction,
  disabled = false,
  className,
}) => {
  const handleAction = (action: 'pass' | 'info' | 'like' | 'super_like') => {
    if (!disabled) {
      onAction(action);
    }
  };

  return (
    <div className={`${styles.controlsContainer}${className ? ` ${className}` : ''}`}>
      <button
        className={styles.actionButton({ variant: 'pass' })}
        onClick={() => handleAction('pass')}
        disabled={disabled}
        title='Pass - Not interested'
        type='button'
      >
        <span className={styles.buttonIcon}>
          <MdClose />
        </span>
      </button>

      <button
        className={styles.actionButton({ variant: 'info' })}
        onClick={() => handleAction('info')}
        disabled={disabled}
        title='Info - View details'
        type='button'
      >
        <span className={styles.buttonIcon}>
          <MdInfo />
        </span>
      </button>

      <button
        className={styles.actionButton({ variant: 'like' })}
        onClick={() => handleAction('like')}
        disabled={disabled}
        title='Like - Add to favorites'
        type='button'
      >
        <span className={styles.buttonIcon}>
          <MdFavorite />
        </span>
      </button>

      <button
        className={styles.actionButton({ variant: 'super' })}
        onClick={() => handleAction('super_like')}
        disabled={disabled}
        title='Super Like - Priority interest'
        type='button'
      >
        <span className={styles.buttonIcon}>
          <MdStar />
        </span>
      </button>
    </div>
  );
};
