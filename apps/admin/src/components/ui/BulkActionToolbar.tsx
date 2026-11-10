import React from 'react';
import { Button } from '@adopt-dont-shop/lib.components';
import * as styles from './BulkActionToolbar.css';
import { SquareCheck, X } from 'lucide-react';

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

const buttonVariant = (variant: BulkAction['variant']) =>
  variant === 'neutral' || variant === undefined ? 'outline' : variant;

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
        <SquareCheck size='1em' />
        {selectedCount} selected
      </div>

      {selectedCount < totalCount && (
        <Button variant='ghost' size='sm' onClick={onSelectAll}>
          Select all {totalCount}
        </Button>
      )}

      <div className={styles.divider} />

      <div className={styles.actionGroup}>
        {actions.map(action => (
          <Button
            key={action.label}
            variant={buttonVariant(action.variant)}
            size='sm'
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <Button
        variant='outline'
        size='sm'
        className={styles.clearButton}
        onClick={onClearSelection}
        aria-label='Clear selection'
        startIcon={<X size='1em' />}
      >
        Clear
      </Button>
    </div>
  );
};
