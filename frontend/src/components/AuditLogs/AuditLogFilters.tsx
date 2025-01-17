import { FormInput, SelectInput, TextInput } from '@adoptdontshop/components'
import React, { ChangeEvent } from 'react'
import styled from 'styled-components'
import { AuditLogFilters as AuditLogFiltersType } from '../../libs/audit-logs'
import { DateInput } from '../DateInput'

const FiltersContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: ${({ theme }) => theme.background.content};
  border-radius: ${({ theme }) => theme.border.radius.md};
`

type AuditLogFiltersProps = {
  filters: AuditLogFiltersType
  onFilterChange: (name: string, value: string) => void
}

const levelOptions = [
  { value: '', label: 'All Levels' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
]

export const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const handleDateChange =
    (name: string) => (e: ChangeEvent<HTMLInputElement>) => {
      onFilterChange(name, e.target.value)
    }

  const handleInputChange =
    (name: string) => (e: ChangeEvent<HTMLInputElement>) => {
      onFilterChange(name, e.target.value)
    }

  const handleSelectChange =
    (name: string) => (e: ChangeEvent<HTMLSelectElement>) => {
      onFilterChange(name, e.target.value)
    }

  return (
    <FiltersContainer>
      <FormInput label="Search">
        <TextInput
          value={filters.search || ''}
          onChange={handleInputChange('search')}
          placeholder="Search actions or services..."
          type="text"
        />
      </FormInput>

      <FormInput label="Start Date">
        <DateInput
          value={filters.startDate || ''}
          onChange={handleDateChange('startDate')}
        />
      </FormInput>

      <FormInput label="End Date">
        <DateInput
          value={filters.endDate || ''}
          onChange={handleDateChange('endDate')}
        />
      </FormInput>

      <FormInput label="Level">
        <SelectInput
          value={filters.level || ''}
          onChange={handleSelectChange('level')}
          options={levelOptions}
        />
      </FormInput>

      <FormInput label="Service">
        <TextInput
          value={filters.service || ''}
          onChange={handleInputChange('service')}
          placeholder="Filter by service..."
          type="text"
        />
      </FormInput>

      <FormInput label="Category">
        <TextInput
          value={filters.category || ''}
          onChange={handleInputChange('category')}
          placeholder="Filter by category..."
          type="text"
        />
      </FormInput>

      <FormInput label="User">
        <TextInput
          value={filters.user || ''}
          onChange={handleInputChange('user')}
          placeholder="Filter by user..."
          type="text"
        />
      </FormInput>
    </FiltersContainer>
  )
}
