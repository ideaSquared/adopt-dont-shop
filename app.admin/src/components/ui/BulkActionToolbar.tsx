import React from 'react';
import * as styles from './BulkActionToolbar.css';
import { FiX, FiCheckSquare } from 'react-icons/fi';

export type BulkAction = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'warning' | 'neutral';
  disabled?: boolean;
};

type BulkActionToolbarProps = {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  onSelectAll: () => void;
  onClearSelection: () => void;
};

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  totalCount,
  actions,
  onSelectAll,
  onClearSelection,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={styles.toolbar} role='toolbar' aria-label='Bulk actions'>
      <div className={styles.selectionInfo}>
        <FiCheckSquare />
        {selectedCount} selected
      </div>

      {selectedCount < totalCount && (
        <button className={styles.selectAllButton} onClick={onSelectAll} type='button'>
          Select all {totalCount}
        </button>
      )}

      <div className={styles.divider} />

      <div className={styles.actionGroup}>
        {actions.map(action => (
          <button
            key={action.label}
            className={styles.actionButton({ variant: action.variant ?? 'neutral' })}
            onClick={action.onClick}
            disabled={action.disabled}
            type='button'
          >
            {action.label}
          </button>
        ))}
      </div>

      <button className={styles.clearButton} onClick={onClearSelection} type='button' aria-label='Clear selection'>
        <FiX />
        Clear
      </button>
    </div>
  );
};
