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
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: ${(props) => props.theme.background.content};
  border-radius: ${(props) => props.theme.border.radius.md};

  /* Ensure filters have a reasonable minimum width while allowing them to grow */
  > * {
    flex: 1 1 300px;
    min-width: 200px;
    max-width: 100%;
  }
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
        onFilterChange(name, (e.target as HTMLInputElement).checked)
      } else {
        onFilterChange(name, e.target.value)
      }
    }

  return (
    <FiltersContainer role="search" aria-label="Filter options">
      {filterConfig.map(({ name, label, type, placeholder, options }) => {
        const inputId = `filter-${name}`
        return (
          <FormInput key={name} label={label} id={inputId}>
            {type === 'text' && (
              <TextInput
                id={inputId}
                value={filters[name] || ''}
                onChange={handleChange(name, type)}
                placeholder={placeholder || ''}
                type="text"
              />
            )}
            {type === 'date' && (
              <DateInput
                id={inputId}
                value={filters[name] || ''}
                onChange={handleChange(name, type)}
              />
            )}
            {type === 'select' && options && (
              <SelectInput
                id={inputId}
                value={filters[name] || ''}
                onChange={handleChange(name, type)}
                options={options}
              />
            )}
            {type === 'checkbox' && (
              <CheckboxInput
                id={inputId}
                checked={!!filters[name]}
                onChange={handleChange(name, type)}
              />
            )}
          </FormInput>
        )
      })}
    </FiltersContainer>
  )
}

export default GenericFilters
