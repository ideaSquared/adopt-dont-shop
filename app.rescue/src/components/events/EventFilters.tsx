import React from 'react';
import { EventType, EventStatus, EventFilter, CalendarView } from '../../types/events';
import * as styles from './EventFilters.css';

interface EventFiltersProps {
  filters: EventFilter;
  onFiltersChange: (filters: EventFilter) => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const EventFilters: React.FC<EventFiltersProps> = ({
  filters,
  onFiltersChange,
  view,
  onViewChange,
}) => {
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      type: e.target.value as EventType | 'all',
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      status: e.target.value as EventStatus | 'all',
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      searchQuery: e.target.value,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      type: 'all',
      status: 'all',
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.type !== 'all' || filters.status !== 'all' || filters.searchQuery;

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersGrid}>
        <div className={styles.filterGroup}>
          <label className={styles.label} htmlFor="event-type">
            Event Type
          </label>
          <select
            className={styles.select}
            id="event-type"
            value={filters.type || 'all'}
            onChange={handleTypeChange}
          >
            <option value="all">All Types</option>
            <option value="adoption">Adoption Events</option>
            <option value="fundraising">Fundraising</option>
            <option value="volunteer">Volunteer Events</option>
            <option value="community">Community Outreach</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label} htmlFor="event-status">
            Status
          </label>
          <select
            className={styles.select}
            id="event-status"
            value={filters.status || 'all'}
            onChange={handleStatusChange}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label} htmlFor="event-search">
            Search Events
          </label>
          <input
            className={styles.searchInput}
            id="event-search"
            type="text"
            placeholder="Search by name or description..."
            value={filters.searchQuery || ''}
            onChange={handleSearchChange}
          />
        </div>

        {hasActiveFilters && (
          <div className={`${styles.filterGroup} ${styles.filterGroupRight}`}>
            <button className={styles.clearButton} onClick={handleClearFilters}>
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      <div className={styles.viewToggle}>
        <button
          className={styles.viewButton({ active: view === 'list' })}
          onClick={() => onViewChange('list')}
        >
          📋 List View
        </button>
        <button
          className={styles.viewButton({ active: view === 'month' })}
          onClick={() => onViewChange('month')}
        >
          📅 Calendar View
        </button>
      </div>
    </div>
  );
};

export default EventFilters;
