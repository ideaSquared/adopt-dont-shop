import { ChangeEvent } from 'react';
import styled from 'styled-components';
import { Input } from '../../ui/Input';
import { CheckboxInput } from '../CheckboxInput';
import { DateInput } from '../DateInput';
import { SelectInput } from '../SelectInput';

const FiltersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: ${props => props.theme.background.overlay};
  border-radius: ${props => props.theme.border.radius.md};

  /* Ensure filters have a reasonable minimum width while allowing them to grow */
  > * {
    flex: 1 1 300px;
    min-width: 200px;
    max-width: 100%;
  }
`;

export type FilterConfig = {
  name: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'checkbox';
  placeholder?: string;
  options?: { value: string; label: string }[];
};

type GenericFiltersProps<T> = {
  filters: T;
  onFilterChange: {
    (name: string, value: string): void;
    (name: string, value: boolean): void;
  };
  filterConfig: FilterConfig[];
};

type FilterRecord = Record<string, string | boolean | number | undefined>;
const GenericFilters = <T extends FilterRecord>({
  filters,
  onFilterChange,
  filterConfig,
}: GenericFiltersProps<T>): JSX.Element => {
  const handleChange =
    (name: string, type: 'text' | 'date' | 'checkbox') => (e: ChangeEvent<HTMLInputElement>) => {
      if (type === 'checkbox') {
        onFilterChange(name, (e.target as HTMLInputElement).checked);
      } else {
        onFilterChange(name, e.target.value);
      }
    };

  const handleSelectChange = (name: string) => (value: string | string[]) => {
    onFilterChange(name, value as string);
  };

  return (
    <FiltersContainer role='search' aria-label='Filter options'>
      {filterConfig.map(({ name, label, type, placeholder, options }) => {
        const inputId = `filter-${name}`;
        const value = filters[name];
        return (
          <div key={name}>
            {type === 'text' && (
              <Input
                id={inputId}
                label={label}
                value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
                onChange={handleChange(name, type)}
                placeholder={placeholder || ''}
                type='text'
              />
            )}
            {type === 'date' && (
              <DateInput
                id={inputId}
                value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
                onChange={handleChange(name, type)}
              />
            )}
            {type === 'select' && options && (
              <SelectInput
                value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
                onChange={handleSelectChange(name)}
                options={options}
              />
            )}
            {type === 'checkbox' && (
              <CheckboxInput id={inputId} checked={!!value} onChange={handleChange(name, type)} />
            )}
          </div>
        );
      })}
    </FiltersContainer>
  );
};

export default GenericFilters;
