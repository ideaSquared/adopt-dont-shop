import React from 'react';
import * as styles from './FilterPanel.css';
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
  values: Record<string, unknown>;
  onChange: (filterId: string, value: unknown) => void;
  onClear: () => void;
  onApply?: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
  onChange,
  onClear,
  onApply,
}) => {
  const renderFilter = (filter: FilterOption) => {
    switch (filter.type) {
      case 'select':
        return (
          <select
            className={styles.select}
            value={(values[filter.id] as string) || ''}
            onChange={e => onChange(filter.id, e.target.value)}
          >
            <option value=''>{filter.placeholder || 'Select...'}</option>
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'text':
        return (
          <input
            className={styles.input}
            type='text'
            value={(values[filter.id] as string) || ''}
            onChange={e => onChange(filter.id, e.target.value)}
            placeholder={filter.placeholder}
          />
        );

      case 'date':
        return (
          <input
            className={styles.input}
            type='date'
            value={(values[filter.id] as string) || ''}
            onChange={e => onChange(filter.id, e.target.value)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.header}>
        <div className={styles.title}>
          <FiFilter />
          Filters
        </div>
        <button className={styles.clearButton} onClick={onClear}>
          <FiX />
          Clear All
        </button>
      </div>

      <div className={styles.filtersGrid}>
        {filters.map(filter => (
          <div className={styles.filterGroup} key={filter.id}>
            <label className={styles.filterLabel}>{filter.label}</label>
            {renderFilter(filter)}
          </div>
        ))}
      </div>

      {onApply && (
        <button className={styles.applyButton} onClick={onApply}>
          Apply Filters
        </button>
      )}
    </div>
  );
};
