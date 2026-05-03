import React from 'react';
import { Button } from '@adopt-dont-shop/lib.components';
import { formatStatusName } from '../../utils/statusUtils';
import * as styles from './ApplicationFilters.css';

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
    <div className={styles.filtersContainer}>
      <div className={styles.filtersHeader}>
        <h3>Search & Filter Applications</h3>
      </div>

      <div className={styles.filtersGrid}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="search">
            Search
          </label>
          <input
            className={styles.filterInput}
            id="search"
            type="text"
            placeholder="Applicant name or email..."
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="status">
            Status
          </label>
          <select
            className={styles.filterSelect}
            id="status"
            value={filters.status}
            onChange={e => onFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="submitted">{formatStatusName('submitted')}</option>
            <option value="approved">{formatStatusName('approved')}</option>
            <option value="rejected">{formatStatusName('rejected')}</option>
            <option value="withdrawn">{formatStatusName('withdrawn')}</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="priority">
            Priority
          </label>
          <select
            className={styles.filterSelect}
            id="priority"
            value={filters.priority}
            onChange={e => onFilterChange('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="petType">
            Pet Type
          </label>
          <select
            className={styles.filterSelect}
            id="petType"
            value={filters.petType}
            onChange={e => onFilterChange('petType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Dog">Dogs</option>
            <option value="Cat">Cats</option>
            <option value="Rabbit">Rabbits</option>
            <option value="Bird">Birds</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="referencesStatus">
            References
          </label>
          <select
            className={styles.filterSelect}
            id="referencesStatus"
            value={filters.referencesStatus}
            onChange={e => onFilterChange('referencesStatus', e.target.value)}
          >
            <option value="">All Reference Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="homeVisitStatus">
            Home Visit
          </label>
          <select
            className={styles.filterSelect}
            id="homeVisitStatus"
            value={filters.homeVisitStatus}
            onChange={e => onFilterChange('homeVisitStatus', e.target.value)}
          >
            <option value="">All Visit Statuses</option>
            <option value="not_scheduled">Not Scheduled</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="dateRange">
            Date Range
          </label>
          <select
            className={styles.filterSelect}
            id="dateRange"
            value={filters.dateRange}
            onChange={e => onFilterChange('dateRange', e.target.value)}
          >
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="petBreed">
            Pet Breed
          </label>
          <input
            className={styles.filterInput}
            id="petBreed"
            type="text"
            placeholder="Search breed (e.g. golden, lab, persian)..."
            value={filters.petBreed}
            onChange={e => onFilterChange('petBreed', e.target.value)}
          />
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
