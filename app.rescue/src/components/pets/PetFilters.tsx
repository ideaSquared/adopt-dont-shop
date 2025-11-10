import React from 'react';
import styled from 'styled-components';
import { Button } from '@adopt-dont-shop/components';

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

interface PetFiltersProps {
  filters: {
    search: string;
    type: string;
    status: string;
    size: string;
    breed: string;
    ageGroup: string;
    gender: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
}

const PetFilters: React.FC<PetFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  onApplyFilters,
}) => {
  return (
    <FiltersContainer>
      <FiltersHeader>
        <h3>Search & Filter Pets</h3>
      </FiltersHeader>

      <FiltersGrid>
        <FilterGroup>
          <label className="label" htmlFor="search">Search</label>
          <input
            id="search"
            type="text"
            placeholder="Pet name, breed, or ID..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="type">Pet Type</label>
          <select
            id="type"
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
            <option value="rabbit">Rabbits</option>
            <option value="bird">Birds</option>
            <option value="other">Other</option>
          </select>
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="status">Status</label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="adopted">Adopted</option>
            <option value="foster">Foster</option>
            <option value="medical_hold">Medical Hold</option>
            <option value="behavioral_hold">Behavioral Hold</option>
            <option value="not_available">Not Available</option>
          </select>
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="size">Size</label>
          <select
            id="size"
            value={filters.size}
            onChange={(e) => onFilterChange('size', e.target.value)}
          >
            <option value="">All Sizes</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="extra_large">Extra Large</option>
          </select>
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="breed">Breed</label>
          <input
            id="breed"
            type="text"
            placeholder="Enter breed..."
            value={filters.breed}
            onChange={(e) => onFilterChange('breed', e.target.value)}
          />
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="ageGroup">Age Group</label>
          <select
            id="ageGroup"
            value={filters.ageGroup}
            onChange={(e) => onFilterChange('ageGroup', e.target.value)}
          >
            <option value="">All Ages</option>
            <option value="young">Young</option>
            <option value="adult">Adult</option>
            <option value="senior">Senior</option>
          </select>
        </FilterGroup>

        <FilterGroup>
          <label className="label" htmlFor="gender">Gender</label>
          <select
            id="gender"
            value={filters.gender}
            onChange={(e) => onFilterChange('gender', e.target.value)}
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </FilterGroup>
      </FiltersGrid>

      <FilterActions>
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
        <Button variant="primary" onClick={onApplyFilters}>
          Apply Filters
        </Button>
      </FilterActions>
    </FiltersContainer>
  );
};

export default PetFilters;
