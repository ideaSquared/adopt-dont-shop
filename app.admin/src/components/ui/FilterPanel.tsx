import React from 'react';
import styled from 'styled-components';
import { FiFilter, FiX } from 'react-icons/fi';

export interface FilterOption {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'date' | 'daterange';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterPanelProps {
  filters: FilterOption[];
  values: Record<string, any>;
  onChange: (filterId: string, value: any) => void;
  onClear: () => void;
  onApply?: () => void;
}

const PanelContainer = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;

  svg {
    color: #6b7280;
  }
`;

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  svg {
    font-size: 1rem;
  }
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.625rem 2.5rem 0.625rem 0.75rem;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #111827;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }

  &:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #111827;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }

  &::placeholder {
    color: #9ca3af;
  }

  &:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }
`;

const ApplyButton = styled.button`
  margin-top: 1rem;
  width: 100%;
  padding: 0.75rem;
  background: ${props => props.theme.colors.primary[600]};
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary[700]};
  }
`;

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
  onChange,
  onClear,
  onApply
}) => {
  const renderFilter = (filter: FilterOption) => {
    switch (filter.type) {
      case 'select':
        return (
          <Select
            value={values[filter.id] || ''}
            onChange={(e) => onChange(filter.id, e.target.value)}
          >
            <option value="">{filter.placeholder || 'Select...'}</option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );

      case 'text':
        return (
          <Input
            type="text"
            value={values[filter.id] || ''}
            onChange={(e) => onChange(filter.id, e.target.value)}
            placeholder={filter.placeholder}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={values[filter.id] || ''}
            onChange={(e) => onChange(filter.id, e.target.value)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <PanelContainer>
      <Header>
        <Title>
          <FiFilter />
          Filters
        </Title>
        <ClearButton onClick={onClear}>
          <FiX />
          Clear All
        </ClearButton>
      </Header>

      <FiltersGrid>
        {filters.map((filter) => (
          <FilterGroup key={filter.id}>
            <FilterLabel>{filter.label}</FilterLabel>
            {renderFilter(filter)}
          </FilterGroup>
        ))}
      </FiltersGrid>

      {onApply && (
        <ApplyButton onClick={onApply}>
          Apply Filters
        </ApplyButton>
      )}
    </PanelContainer>
  );
};
