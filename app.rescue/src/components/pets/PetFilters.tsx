import React from 'react';
import { Button } from '@adopt-dont-shop/lib.components';
import * as styles from './PetFilters.css';

interface PetFiltersProps {
  filters: {
    search: string;
    type: string;
    status: string;
    size: string;
    breed: string;
    ageGroup: string;
    gender: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
}

const PetFilters: React.FC<PetFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  onApplyFilters,
}) => {
  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersHeader}>
        <h3>Search & Filter Pets</h3>
      </div>

      <div className={styles.filtersGrid}>
        <div className={styles.filterGroup}>
          <label className="label" htmlFor="search">
            Search
          </label>
          <input
            id="search"
            type="text"
            placeholder="Pet name, breed, or ID..."
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className="label" htmlFor="type">
            Pet Type
          </label>
          <select
            id="type"
            value={filters.type}
            onChange={e => onFilterChange('type', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
            <option value="rabbit">Rabbits</option>
            <option value="bird">Birds</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            value={filters.status}
            onChange={e => onFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="adopted">Adopted</option>
            <option value="foster">Foster</option>
            <option value="medical_hold">Medical Hold</option>
            <option value="behavioral_hold">Behavioral Hold</option>
            <option value="not_available">Not Available</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className="label" htmlFor="size">
            Size
          </label>
          <select
            id="size"
            value={filters.size}
            onChange={e => onFilterChange('size', e.target.value)}
          >
            <option value="">All Sizes</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="extra_large">Extra Large</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className="label" htmlFor="breed">
            Breed
          </label>
          <input
            id="breed"
            type="text"
            placeholder="Enter breed..."
            value={filters.breed}
            onChange={e => onFilterChange('breed', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className="label" htmlFor="ageGroup">
            Age Group
          </label>
          <select
            id="ageGroup"
            value={filters.ageGroup}
            onChange={e => onFilterChange('ageGroup', e.target.value)}
          >
            <option value="">All Ages</option>
            <option value="young">Young</option>
            <option value="adult">Adult</option>
            <option value="senior">Senior</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className="label" htmlFor="gender">
            Gender
          </label>
          <select
            id="gender"
            value={filters.gender}
            onChange={e => onFilterChange('gender', e.target.value)}
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      <div className={styles.filterActions}>
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
        <Button variant="primary" onClick={onApplyFilters}>
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default PetFilters;
