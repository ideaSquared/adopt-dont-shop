import React from 'react';
import { MdClose, MdFavorite, MdInfoOutline, MdReplay, MdStar } from 'react-icons/md';
import * as styles from './SwipeControls.css';

interface SwipeControlsProps {
  onAction: (action: 'pass' | 'info' | 'like' | 'super_like') => void;
  onUndo?: () => void;
  canUndo?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SwipeControls: React.FC<SwipeControlsProps> = ({
  onAction,
  onUndo,
  canUndo = false,
  disabled = false,
  className,
}) => {
  const handleAction = (action: 'pass' | 'info' | 'like' | 'super_like') => {
    if (!disabled) {
      onAction(action);
    }
  };

  return (
    <div
      className={`${styles.controlsContainer}${className ? ` ${className}` : ''}`}
      role='group'
      aria-label='Swipe actions'
    >
      {onUndo && (
        <button
          className={styles.actionButton({ variant: 'undo' })}
          onClick={onUndo}
          disabled={disabled || !canUndo}
          aria-label='Undo last swipe'
          title='Undo last swipe'
          type='button'
        >
          <span className={styles.buttonIcon}>
            <MdReplay />
          </span>
        </button>
      )}

      <button
        className={styles.actionButton({ variant: 'pass' })}
        onClick={() => handleAction('pass')}
        disabled={disabled}
        aria-label='Pass on this pet'
        title='Pass — not interested'
        type='button'
      >
        <span className={styles.buttonIcon}>
          <MdClose />
        </span>
      </button>

      <button
        className={styles.actionButton({ variant: 'super' })}
        onClick={() => handleAction('super_like')}
        disabled={disabled}
        aria-label='Super like this pet'
        title='Super Like — priority interest'
        type='button'
      >
        <span className={styles.buttonIcon}>
          <MdStar />
        </span>
      </button>

      <button
        className={styles.actionButton({ variant: 'like' })}
        onClick={() => handleAction('like')}
        disabled={disabled}
        aria-label='Like this pet'
        title='Like — add to favorites'
        type='button'
      >
        <span className={styles.buttonIcon}>
          <MdFavorite />
        </span>
      </button>

      <button
        className={styles.actionButton({ variant: 'info' })}
        onClick={() => handleAction('info')}
        disabled={disabled}
        aria-label='View pet details'
        title='View full details'
        type='button'
      >
        <span className={styles.buttonIcon}>
          <MdInfoOutline />
        </span>
      </button>
    </div>
  );
};
