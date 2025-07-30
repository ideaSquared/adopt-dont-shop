import React from 'react';
import styled from 'styled-components';

const FilterContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.active ? '#007bff' : '#ddd'};
  background: ${props => props.active ? '#007bff' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #007bff;
    background: ${props => props.active ? '#0056b3' : '#f8f9fa'};
  }
`;

const StatusCount = styled.span`
  margin-left: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.8;
`;

interface ApplicationStatusFilterProps {
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  statusCounts?: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
    under_review: number;
  };
}

export const ApplicationStatusFilter: React.FC<ApplicationStatusFilterProps> = ({
  selectedStatus,
  onStatusChange,
  statusCounts,
}) => {
  const statuses = [
    { key: 'all', label: 'All', count: statusCounts?.all },
    { key: 'pending', label: 'Pending', count: statusCounts?.pending },
    { key: 'under_review', label: 'Under Review', count: statusCounts?.under_review },
    { key: 'approved', label: 'Approved', count: statusCounts?.approved },
    { key: 'rejected', label: 'Rejected', count: statusCounts?.rejected },
  ];

  return (
    <FilterContainer>
      {statuses.map((status) => (
        <FilterButton
          key={status.key}
          active={selectedStatus === status.key}
          onClick={() => onStatusChange(status.key)}
        >
          {status.label}
          {status.count !== undefined && (
            <StatusCount>({status.count})</StatusCount>
          )}
        </FilterButton>
      ))}
    </FilterContainer>
  );
};
