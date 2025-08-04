import React from 'react';
import styled from 'styled-components';
import { Button } from '@adopt-dont-shop/components';

const StatusFilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0;
`;

const StatusButton = styled(Button)<{ active: boolean }>`
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: 20px;
  border: 1px solid ${props => props.active ? props.theme.colors.primary[500] : props.theme.colors.neutral[300]};
  background: ${props => props.active ? props.theme.colors.primary[500] : 'white'};
  color: ${props => props.active ? 'white' : props.theme.text.secondary};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary[500]};
    background: ${props => props.active ? props.theme.colors.primary[600] : props.theme.colors.primary[50]};
    color: ${props => props.active ? 'white' : props.theme.colors.primary[700]};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary[400]};
    outline-offset: 2px;
  }

  &:focus:not(:focus-visible) {
    outline: none;
  }
`;

const StatusCount = styled.span<{ active: boolean }>`
  margin-left: 0.5rem;
  padding: 0.125rem 0.375rem;
  background: ${props => props.active 
    ? 'rgba(255, 255, 255, 0.2)' 
    : props.theme.colors.neutral[200]
  };
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${props => props.active ? 'white' : props.theme.text.secondary};
  border: ${props => props.active ? '1px solid rgba(255, 255, 255, 0.3)' : 'none'};
`;

interface PetStatusFilterProps {
  activeStatus: string;
  statusCounts: Record<string, number>;
  onStatusChange: (status: string) => void;
}

const statusOptions = [
  { value: '', label: 'All Pets' },
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Pending' },
  { value: 'adopted', label: 'Adopted' },
  { value: 'foster', label: 'Foster' },
  { value: 'medical_hold', label: 'Medical Hold' },
  { value: 'behavioral_hold', label: 'Behavioral Hold' },
  { value: 'not_available', label: 'Not Available' },
];

const PetStatusFilter: React.FC<PetStatusFilterProps> = ({
  activeStatus,
  statusCounts,
  onStatusChange,
}) => {
  const getTotalCount = () => {
    return Object.values(statusCounts).reduce((total, count) => total + count, 0);
  };

  return (
    <StatusFilterContainer role="group" aria-label="Filter pets by status">
      {statusOptions.map((option) => {
        const count = option.value === '' ? getTotalCount() : statusCounts[option.value] || 0;
        const isActive = activeStatus === option.value;
        
        return (
          <StatusButton
            key={option.value}
            active={isActive}
            onClick={() => onStatusChange(option.value)}
            variant="outline"
            aria-pressed={isActive}
            aria-label={`${option.label} (${count} pets)`}
          >
            {option.label}
            <StatusCount active={isActive} aria-hidden="true">{count}</StatusCount>
          </StatusButton>
        );
      })}
    </StatusFilterContainer>
  );
};

export default PetStatusFilter;
