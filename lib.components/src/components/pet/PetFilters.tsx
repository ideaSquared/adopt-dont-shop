import React, { useState } from 'react';
import styled from 'styled-components';
import { CheckboxInput } from '../form/CheckboxInput';
import { SelectInput } from '../form/SelectInput';
import { TextInput } from '../form/TextInput';
import { Stack } from '../layout/Stack';
import { Button } from '../ui/Button';

export type PetFilterValues = {
  type?: string[];
  breed?: string;
  age?: string[];
  size?: string[];
  gender?: string[];
  location?: string;
  specialNeeds?: boolean;
  goodWithKids?: boolean;
  goodWithPets?: boolean;
  houseTrained?: boolean;
  declawed?: boolean;
  spayedNeutered?: boolean;
};

export type PetFiltersProps = {
  filters: PetFilterValues;
  onFiltersChange: (filters: PetFilterValues) => void;
  onClearFilters?: () => void;
  showAdvanced?: boolean;
  petTypes?: Array<{ value: string; label: string }>;
  breeds?: Array<{ value: string; label: string }>;
  locations?: Array<{ value: string; label: string }>;
  isLoading?: boolean;
  className?: string;
  'data-testid'?: string;
};

const FilterContainer = styled.div`
  background: ${({ theme }) => theme.colors.neutral.white};
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FilterTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.neutral[900]};
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const FilterLabel = styled.h4`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.neutral[700]};
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const FilterActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: flex-end;
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral[200]};

  @media (max-width: 768px) {
    justify-content: stretch;

    button {
      flex: 1;
    }
  }
`;

const AdvancedToggle = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary.main};
  font-size: ${({ theme }) => theme.typography.size.sm};
  cursor: pointer;
  padding: 0;
  text-decoration: underline;

  &:hover {
    color: ${({ theme }) => theme.colors.primary.dark};
  }
`;

const defaultPetTypes = [
  { value: 'dog', label: 'Dogs' },
  { value: 'cat', label: 'Cats' },
  { value: 'rabbit', label: 'Rabbits' },
  { value: 'bird', label: 'Birds' },
  { value: 'other', label: 'Other' },
];

const ageOptions = [
  { value: 'young', label: 'Young (under 1 year)' },
  { value: 'adult', label: 'Adult (1-7 years)' },
  { value: 'senior', label: 'Senior (7+ years)' },
];

const sizeOptions = [
  { value: 'small', label: 'Small (under 25 lbs)' },
  { value: 'medium', label: 'Medium (25-60 lbs)' },
  { value: 'large', label: 'Large (60-100 lbs)' },
  { value: 'extra-large', label: 'Extra Large (100+ lbs)' },
];

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const PetFilters: React.FC<PetFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  showAdvanced = false,
  petTypes = defaultPetTypes,
  breeds = [],
  className,
  'data-testid': dataTestId,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(showAdvanced);

  const handleFilterChange = <K extends keyof PetFilterValues>(
    key: K,
    value: PetFilterValues[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleMultiSelectChange = (key: keyof PetFilterValues, values: string[]) => {
    handleFilterChange(key, values);
  };

  const handleCheckboxChange = (key: keyof PetFilterValues, checked: boolean) => {
    handleFilterChange(key, checked);
  };

  const handleClearFilters = () => {
    onFiltersChange({});
    onClearFilters?.();
  };

  const hasActiveFilters = Object.values(filters).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.length > 0;
    return false;
  });

  return (
    <FilterContainer className={className} data-testid={dataTestId}>
      <FilterHeader>
        <FilterTitle>Find Your Perfect Pet</FilterTitle>
        {hasActiveFilters && onClearFilters && (
          <Button variant='secondary' size='sm' onClick={handleClearFilters}>
            Clear All
          </Button>
        )}
      </FilterHeader>

      <FilterGrid>
        <FilterSection>
          <SelectInput
            label='Pet Type'
            options={petTypes}
            value={filters.type || []}
            onChange={value =>
              handleMultiSelectChange('type', Array.isArray(value) ? value : [value])
            }
            multiple
            placeholder='All pet types'
            fullWidth
          />
        </FilterSection>

        <FilterSection>
          <SelectInput
            label='Breed'
            options={breeds}
            value={filters.breed || ''}
            onChange={value => handleFilterChange('breed', Array.isArray(value) ? value[0] : value)}
            placeholder='Any breed'
            searchable
            fullWidth
            disabled={breeds.length === 0}
          />
        </FilterSection>

        <FilterSection>
          <SelectInput
            label='Age'
            options={ageOptions}
            value={filters.age || []}
            onChange={value =>
              handleMultiSelectChange('age', Array.isArray(value) ? value : [value])
            }
            multiple
            placeholder='Any age'
            fullWidth
          />
        </FilterSection>

        <FilterSection>
          <SelectInput
            label='Size'
            options={sizeOptions}
            value={filters.size || []}
            onChange={value =>
              handleMultiSelectChange('size', Array.isArray(value) ? value : [value])
            }
            multiple
            placeholder='Any size'
            fullWidth
          />
        </FilterSection>

        <FilterSection>
          <SelectInput
            label='Gender'
            options={genderOptions}
            value={filters.gender || []}
            onChange={value =>
              handleMultiSelectChange('gender', Array.isArray(value) ? value : [value])
            }
            multiple
            placeholder='Any gender'
            fullWidth
          />
        </FilterSection>

        <FilterSection>
          <TextInput
            label='Location'
            value={filters.location || ''}
            onChange={e => handleFilterChange('location', e.target.value)}
            placeholder='Enter city, state, or zip'
            fullWidth
          />
        </FilterSection>
      </FilterGrid>

      {showAdvancedFilters && (
        <>
          <FilterLabel>Special Considerations</FilterLabel>
          <Stack direction='vertical' spacing='sm' style={{ marginBottom: '1rem' }}>
            <CheckboxGroup>
              <CheckboxInput
                label='Special needs pets'
                checked={filters.specialNeeds || false}
                onChange={e => handleCheckboxChange('specialNeeds', e.target.checked)}
              />
              <CheckboxInput
                label='Good with children'
                checked={filters.goodWithKids || false}
                onChange={e => handleCheckboxChange('goodWithKids', e.target.checked)}
              />
              <CheckboxInput
                label='Good with other pets'
                checked={filters.goodWithPets || false}
                onChange={e => handleCheckboxChange('goodWithPets', e.target.checked)}
              />
              <CheckboxInput
                label='House trained'
                checked={filters.houseTrained || false}
                onChange={e => handleCheckboxChange('houseTrained', e.target.checked)}
              />
              <CheckboxInput
                label='Spayed/Neutered'
                checked={filters.spayedNeutered || false}
                onChange={e => handleCheckboxChange('spayedNeutered', e.target.checked)}
              />
            </CheckboxGroup>
          </Stack>
        </>
      )}

      <FilterActions>
        <AdvancedToggle onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
          {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
        </AdvancedToggle>
      </FilterActions>
    </FilterContainer>
  );
};

