import clsx from 'clsx';
import type { ChangeEvent } from 'react';

import { Input } from '../../ui/Input';
import FilterPanel, { type FilterConfig } from '../../form/FilterPanel';

import * as styles from './SearchToolbar.css';

export type { FilterConfig };

export type SearchToolbarActiveFilter = {
  name: string;
  label: string;
  value: string;
};

type FilterValues = Record<string, string | boolean | number | undefined>;

export type SearchToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  filterConfig?: FilterConfig[];
  filters?: FilterValues;
  onFilterChange?: (name: string, value: string | boolean) => void;
  activeFilters?: SearchToolbarActiveFilter[];
  onRemoveFilter?: (name: string) => void;
  resultCount?: number;
  resultNoun?: string;
  className?: string;
  'data-testid'?: string;
};

const CloseIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
    <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
  </svg>
);

const formatCount = (count: number, noun: string): string =>
  `${count} ${count === 1 ? noun : `${noun}s`}`;

export const SearchToolbar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchLabel = 'Search',
  filterConfig,
  filters,
  onFilterChange,
  activeFilters = [],
  onRemoveFilter,
  resultCount,
  resultNoun = 'result',
  className,
  'data-testid': testId,
}: SearchToolbarProps) => {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  return (
    <div
      className={clsx(styles.container, className)}
      role='search'
      aria-label='Search and filter'
      data-testid={testId}
    >
      <div className={styles.searchRow}>
        <div className={styles.searchField}>
          <Input
            type='search'
            label={searchLabel}
            value={searchValue}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
          />
        </div>

        {resultCount !== undefined && (
          <p className={styles.resultSummary} role='status' aria-live='polite'>
            {formatCount(resultCount, resultNoun)}
          </p>
        )}
      </div>

      {filterConfig && filters !== undefined && onFilterChange && (
        <FilterPanel
          filterConfig={filterConfig}
          filters={filters}
          onFilterChange={onFilterChange}
        />
      )}

      {activeFilters.length > 0 && (
        <ul className={styles.chipList}>
          {activeFilters.map(filter => (
            <li key={filter.name} className={styles.chip}>
              <span>
                {filter.label}: {filter.value}
              </span>
              <button
                type='button'
                className={styles.chipRemove}
                aria-label={`Remove filter ${filter.label}: ${filter.value}`}
                onClick={() => onRemoveFilter?.(filter.name)}
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
