import React from 'react';
import styled from 'styled-components';
import { Button } from '@adopt-dont-shop/components';
import { formatStatusName } from '../../utils/statusUtils';

const FiltersContainer = styled.div`
  padding: 0.75rem;
  margin-bottom: 0;
  background: white;
  border: 1px solid ${props => props.theme.colors.neutral[200]};
  border-radius: 8px;
`;

const FiltersHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;

  h3 {
    margin: 0;
    color: ${props => props.theme.text.primary};
    font-size: 1.25rem;
    font-weight: 600;
  }
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const FilterGroup = styled.div`
  .label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    color: ${props => props.theme.text.primary};
  }

  select, input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid ${props => props.theme.colors.neutral[300]};
    border-radius: 4px;
    font-size: 0.875rem;
    font-family: inherit;
    background: white;

    &:focus {
      outline: none;
      border-color: ${props => props.theme.colors.primary[500]};
      box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
    }
  }
`;

const FilterActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${props => props.theme.colors.neutral[200]};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

interface ApplicationFiltersProps {
  filters: {
    search: string;
    status: string;
    priority: string;
    petType: string;
    referencesStatus: string;
    homeVisitStatus: string;
    dateRange: string;
    petBreed: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

const ApplicationFilters: React.FC<ApplicationFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <FiltersContainer>
      <FiltersHeader>
        <h3>Search & Filter Applications</h3>
      </FiltersHeader>

      <FiltersGrid>
        <FilterGroup>
          <label className="label" htmlFor="search">Search</label>
          <input
            id="search"
            type="text"
            placeholder="Applicant name or email..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="status">Status</label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="submitted">{formatStatusName('submitted')}</option>
            <option value="approved">{formatStatusName('approved')}</option>
            <option value="rejected">{formatStatusName('rejected')}</option>
            <option value="withdrawn">{formatStatusName('withdrawn')}</option>
          </select>
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={filters.priority}
            onChange={(e) => onFilterChange('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="petType">Pet Type</label>
          <select
            id="petType"
            value={filters.petType}
            onChange={(e) => onFilterChange('petType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Dog">Dogs</option>
            <option value="Cat">Cats</option>
            <option value="Rabbit">Rabbits</option>
            <option value="Bird">Birds</option>
            <option value="Other">Other</option>
          </select>
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="referencesStatus">References</label>
          <select
            id="referencesStatus"
            value={filters.referencesStatus}
            onChange={(e) => onFilterChange('referencesStatus', e.target.value)}
          >
            <option value="">All Reference Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="homeVisitStatus">Home Visit</label>
          <select
            id="homeVisitStatus"
            value={filters.homeVisitStatus}
            onChange={(e) => onFilterChange('homeVisitStatus', e.target.value)}
          >
            <option value="">All Visit Statuses</option>
            <option value="not_scheduled">Not Scheduled</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="dateRange">Date Range</label>
          <select
            id="dateRange"
            value={filters.dateRange}
            onChange={(e) => onFilterChange('dateRange', e.target.value)}
          >
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="petBreed">Pet Breed</label>
          <input
            id="petBreed"
            type="text"
            placeholder="Search breed (e.g. golden, lab, persian)..."
            value={filters.petBreed}
            onChange={(e) => onFilterChange('petBreed', e.target.value)}
          />
        </FilterGroup>
      </FiltersGrid>

      <FilterActions>
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </FilterActions>
    </FiltersContainer>
  );
};

export default ApplicationFilters;
