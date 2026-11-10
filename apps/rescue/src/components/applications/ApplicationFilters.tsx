import React from 'react';
import { Button, FormField, Input, SelectInput } from '@adopt-dont-shop/lib.components';
import { getStatusDisplay } from '@adopt-dont-shop/lib.types';
import * as styles from './ApplicationFilters.css';

type FilterOption = { value: string; label: string };

type SelectFilter = {
  key: string;
  label: string;
  options: FilterOption[];
};

const SELECT_FILTERS: SelectFilter[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: '', label: 'All Statuses' },
      ...['submitted', 'approved', 'rejected', 'withdrawn'].map(status => ({
        value: status,
        label: getStatusDisplay('application', status).label,
      })),
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    options: [
      { value: '', label: 'All Priorities' },
      { value: 'urgent', label: 'Urgent' },
      { value: 'high', label: 'High' },
      { value: 'normal', label: 'Normal' },
      { value: 'low', label: 'Low' },
    ],
  },
  {
    key: 'petType',
    label: 'Pet Type',
    options: [
      { value: '', label: 'All Types' },
      { value: 'Dog', label: 'Dogs' },
      { value: 'Cat', label: 'Cats' },
      { value: 'Rabbit', label: 'Rabbits' },
      { value: 'Bird', label: 'Birds' },
      { value: 'Other', label: 'Other' },
    ],
  },
  {
    key: 'referencesStatus',
    label: 'References',
    options: [
      { value: '', label: 'All Reference Statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' },
    ],
  },
  {
    key: 'homeVisitStatus',
    label: 'Home Visit',
    options: [
      { value: '', label: 'All Visit Statuses' },
      { value: 'not_scheduled', label: 'Not Scheduled' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' },
    ],
  },
  {
    key: 'dateRange',
    label: 'Date Range',
    options: [
      { value: '', label: 'All Dates' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'Last 7 Days' },
      { value: 'month', label: 'Last 30 Days' },
    ],
  },
];

type FilterValues = {
  search: string;
  status: string;
  priority: string;
  petType: string;
  referencesStatus: string;
  homeVisitStatus: string;
  dateRange: string;
  petBreed: string;
};

type ApplicationFiltersProps = {
  filters: FilterValues;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
};

const selectValue = (value: string | string[]): string => (typeof value === 'string' ? value : '');

const filterValue = (filters: FilterValues, key: string): string =>
  Object.entries(filters).find(([name]) => name === key)?.[1] ?? '';

const ApplicationFilters: React.FC<ApplicationFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersHeader}>
        <h3>Search & Filter Applications</h3>
      </div>

      <div className={styles.filtersGrid}>
        <div className={styles.filterGroup}>
          <FormField label="Search" htmlFor="search">
            <Input
              id="search"
              type="text"
              placeholder="Applicant name or email..."
              value={filters.search}
              onChange={e => onFilterChange('search', e.target.value)}
            />
          </FormField>
        </div>

        {SELECT_FILTERS.map(filter => (
          <div key={filter.key} className={styles.filterGroup}>
            <SelectInput
              label={filter.label}
              value={filterValue(filters, filter.key)}
              onChange={value => onFilterChange(filter.key, selectValue(value))}
              options={filter.options}
              fullWidth
            />
          </div>
        ))}

        <div className={styles.filterGroup}>
          <FormField label="Pet Breed" htmlFor="petBreed">
            <Input
              id="petBreed"
              type="text"
              placeholder="Search breed (e.g. golden, lab, persian)..."
              value={filters.petBreed}
              onChange={e => onFilterChange('petBreed', e.target.value)}
            />
          </FormField>
        </div>
      </div>

      <div className={styles.filterActions}>
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
};

export default ApplicationFilters;
