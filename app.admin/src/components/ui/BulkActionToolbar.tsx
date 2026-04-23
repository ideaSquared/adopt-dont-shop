import React from 'react';
import styled from 'styled-components';
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

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  flex-wrap: wrap;
`;

const SelectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e40af;
  white-space: nowrap;

  svg {
    font-size: 1.125rem;
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 20px;
  background: #bfdbfe;
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex: 1;
`;

const ActionButton = styled.button<{
  $variant: 'primary' | 'danger' | 'warning' | 'neutral';
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  white-space: nowrap;

  background: ${({ $variant }) => {
    switch ($variant) {
      case 'danger':
        return '#fee2e2';
      case 'warning':
        return '#fef3c7';
      case 'primary':
        return '#dbeafe';
      default:
        return '#f3f4f6';
    }
  }};

  color: ${({ $variant }) => {
    switch ($variant) {
      case 'danger':
        return '#991b1b';
      case 'warning':
        return '#92400e';
      case 'primary':
        return '#1e40af';
      default:
        return '#374151';
    }
  }};

  border-color: ${({ $variant }) => {
    switch ($variant) {
      case 'danger':
        return '#fca5a5';
      case 'warning':
        return '#fcd34d';
      case 'primary':
        return '#93c5fd';
      default:
        return '#d1d5db';
    }
  }};

  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  background: transparent;
  border: 1px solid #93c5fd;
  border-radius: 6px;
  font-size: 0.8125rem;
  color: #1e40af;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  margin-left: auto;

  &:hover {
    background: #dbeafe;
  }

  svg {
    font-size: 0.875rem;
  }
`;

const SelectAllButton = styled.button`
  background: none;
  border: none;
  font-size: 0.8125rem;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;

  &:hover {
    color: #1d4ed8;
  }
`;

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
    <Toolbar role='toolbar' aria-label='Bulk actions'>
      <SelectionInfo>
        <FiCheckSquare />
        {selectedCount} selected
      </SelectionInfo>

      {selectedCount < totalCount && (
        <SelectAllButton onClick={onSelectAll} type='button'>
          Select all {totalCount}
        </SelectAllButton>
      )}

      <Divider />

      <ActionGroup>
        {actions.map(action => (
          <ActionButton
            key={action.label}
            $variant={action.variant ?? 'neutral'}
            onClick={action.onClick}
            disabled={action.disabled}
            type='button'
          >
            {action.label}
          </ActionButton>
        ))}
      </ActionGroup>

      <ClearButton onClick={onClearSelection} type='button' aria-label='Clear selection'>
        <FiX />
        Clear
      </ClearButton>
    </Toolbar>
  );
};
