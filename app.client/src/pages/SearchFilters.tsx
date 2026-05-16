import React from 'react';
import * as styles from './SearchPage.css';
import { Button, Card, SelectInput, TextInput } from '@adopt-dont-shop/lib.components';
import { type PetSearchFilters } from '@/services';
import { type useNearbySearch } from '@/hooks/useNearbySearch';
import {
  AGE_GROUPS,
  DISTANCE_OPTIONS,
  PET_GENDERS,
  PET_SIZES,
  PET_STATUS,
  PET_TYPES,
} from './searchOptions';

type SearchFiltersProps = {
  filters: PetSearchFilters;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onFilterChange: (field: keyof PetSearchFilters, value: string) => void;
  geolocation: ReturnType<typeof useNearbySearch>;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onSearch: () => void;
};

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  searchQuery,
  onSearchQueryChange,
  onFilterChange,
  geolocation,
  hasActiveFilters,
  onClearFilters,
  onSearch,
}) => (
  <Card className={styles.filtersCard}>
    <div className={styles.filtersGrid}>
      <TextInput
        label='Search'
        value={searchQuery}
        onChange={e => onSearchQueryChange(e.target.value)}
        placeholder='Search by name, breed, or description...'
      />

      <SelectInput
        label='Pet Type'
        value={filters.type || ''}
        onChange={(value: string | string[]) => onFilterChange('type', value as string)}
        options={PET_TYPES}
      />

      <SelectInput
        label='Size'
        value={filters.size || ''}
        onChange={(value: string | string[]) => onFilterChange('size', value as string)}
        options={PET_SIZES}
      />

      <SelectInput
        label='Gender'
        value={filters.gender || ''}
        onChange={(value: string | string[]) => onFilterChange('gender', value as string)}
        options={PET_GENDERS}
      />

      <SelectInput
        label='Age Group'
        value={filters.ageGroup || ''}
        onChange={(value: string | string[]) => onFilterChange('ageGroup', value as string)}
        options={AGE_GROUPS}
      />

      <SelectInput
        label='Status'
        value={filters.status || ''}
        onChange={(value: string | string[]) => onFilterChange('status', value as string)}
        options={PET_STATUS}
      />

      <SelectInput
        label='Distance'
        value={filters.maxDistance?.toString() || ''}
        onChange={(value: string | string[]) => onFilterChange('maxDistance', value as string)}
        options={DISTANCE_OPTIONS}
      />
    </div>

    <div className={styles.locationFilterRow}>
      <Button
        className={styles.locationButton}
        variant='outline'
        size='sm'
        onClick={geolocation.requestLocation}
        disabled={geolocation.status === 'loading'}
      >
        {geolocation.status === 'loading'
          ? 'Detecting...'
          : geolocation.hasLocation
            ? 'Update My Location'
            : 'Use My Location'}
      </Button>
      <span className={styles.orLabel}>or</span>
      <div className={styles.locationInputGroup}>
        <TextInput
          label='Location'
          value={filters.location || ''}
          onChange={e => onFilterChange('location', e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && filters.location?.trim()) {
              e.preventDefault();
              geolocation.handleUseLocationText(filters.location);
            }
          }}
          placeholder='City or postcode...'
        />
        {filters.location?.trim() && (
          <Button
            className={styles.locationButton}
            variant='outline'
            size='sm'
            onClick={() => geolocation.handleUseLocationText(filters.location || '')}
            disabled={geolocation.isGeocodingLocation}
          >
            {geolocation.isGeocodingLocation ? 'Finding...' : 'Search nearby'}
          </Button>
        )}
      </div>
      {geolocation.hasLocation && (
        <Button
          className={styles.locationButton}
          variant='outline'
          size='sm'
          onClick={geolocation.clearLocation}
        >
          Clear Location
        </Button>
      )}
      {geolocation.hasLocation && (
        <div className={styles.locationStatus({ variant: 'success' })}>
          Location detected - distance search enabled
        </div>
      )}
      {(geolocation.status === 'denied' ||
        geolocation.status === 'error' ||
        geolocation.status === 'unavailable') && (
        <div className={styles.locationStatus({ variant: 'error' })}>{geolocation.error}</div>
      )}
      {geolocation.geocodeError && (
        <div className={styles.locationStatus({ variant: 'error' })}>
          {geolocation.geocodeError}
        </div>
      )}
    </div>

    <div className={styles.filterActions}>
      {hasActiveFilters && (
        <Button variant='outline' onClick={onClearFilters}>
          Clear Filters
        </Button>
      )}
      <Button onClick={onSearch}>Search</Button>
    </div>
  </Card>
);
