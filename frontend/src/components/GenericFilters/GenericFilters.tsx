import {
  CheckboxInput,
  FormInput,
  SelectInput,
  TextInput,
} from '@adoptdontshop/components'
import { ChangeEvent } from 'react'
import styled from 'styled-components'
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

export type FilterConfig = {
  name: string
  label: string
  type: 'text' | 'date' | 'select' | 'checkbox'
  placeholder?: string
  options?: { value: string; label: string }[]
}

type GenericFiltersProps<T> = {
  filters: T
  onFilterChange: {
    (name: string, value: string): void
    (name: string, value: boolean): void
  }
  filterConfig: FilterConfig[]
}

const GenericFilters = <T extends Record<string, any>>({
  filters,
  onFilterChange,
  filterConfig,
}: GenericFiltersProps<T>): JSX.Element => {
  const handleChange =
    (name: string, type: 'text' | 'date' | 'select' | 'checkbox') =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (type === 'checkbox') {
        onFilterChange(name, (e.target as HTMLInputElement).checked) // For checkboxes
      } else {
        onFilterChange(name, e.target.value) // For other inputs
      }
    }

  return (
    <FiltersContainer>
      {filterConfig.map(({ name, label, type, placeholder, options }) => (
        <FormInput key={name} label={label}>
          {type === 'text' && (
            <TextInput
              value={filters[name] || ''}
              onChange={handleChange(name, type)}
              placeholder={placeholder || ''}
              type="text"
            />
          )}
          {type === 'date' && (
            <DateInput
              value={filters[name] || ''}
              onChange={handleChange(name, type)}
            />
          )}
          {type === 'select' && options && (
            <SelectInput
              value={filters[name] || ''}
              onChange={handleChange(name, type)}
              options={options}
            />
          )}
          {type === 'checkbox' && (
            <CheckboxInput
              checked={!!filters[name]}
              onChange={handleChange(name, type)}
            />
          )}
        </FormInput>
      ))}
    </FiltersContainer>
  )
}

export default GenericFilters
