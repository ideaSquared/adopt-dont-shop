import React from 'react';
import { MapPin } from 'lucide-react';
import * as styles from './SearchPage.css';
import { Button, Card, Input, SelectInput } from '@adopt-dont-shop/lib.components';
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

// Layout, top to bottom: a search bar with its submit button attached; the
// attribute filters; then one "where" line (place, use my location, distance).
// Results update as filters change, so the only button is the one that
// submits the typed search.
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
    <div className={styles.filtersHeader}>
      <h2 className={styles.filtersTitle}>Filters</h2>
      {hasActiveFilters && (
        <Button variant='link' size='sm' onClick={onClearFilters}>
          Clear Filters
        </Button>
      )}
    </div>

    <form
      role='search'
      className={styles.searchBar}
      onSubmit={e => {
        e.preventDefault();
        onSearch();
      }}
    >
      <div className={styles.searchField}>
        <Input
          label='Search'
          value={searchQuery}
          onChange={e => onSearchQueryChange(e.target.value)}
          placeholder='Search by name, breed, or description...'
        />
      </div>
      <Button type='submit' className={styles.controlButton}>
        Search
      </Button>
    </form>

    <div className={styles.filtersGrid}>
      <SelectInput
        fullWidth
        label='Pet Type'
        value={filters.type || ''}
        onChange={(value: string | string[]) => onFilterChange('type', value as string)}
        options={PET_TYPES}
      />

      <SelectInput
        fullWidth
        label='Size'
        value={filters.size || ''}
        onChange={(value: string | string[]) => onFilterChange('size', value as string)}
        options={PET_SIZES}
      />

      <SelectInput
        fullWidth
        label='Gender'
        value={filters.gender || ''}
        onChange={(value: string | string[]) => onFilterChange('gender', value as string)}
        options={PET_GENDERS}
      />

      <SelectInput
        fullWidth
        label='Age Group'
        value={filters.ageGroup || ''}
        onChange={(value: string | string[]) => onFilterChange('ageGroup', value as string)}
        options={AGE_GROUPS}
      />

      <SelectInput
        fullWidth
        label='Status'
        value={filters.status || ''}
        onChange={(value: string | string[]) => onFilterChange('status', value as string)}
        options={PET_STATUS}
      />
    </div>

    <div className={styles.locationFilterRow}>
      <div className={styles.locationInputGroup}>
        <Input
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
      </div>
      {filters.location?.trim() && (
        <Button
          className={styles.controlButton}
          variant='outline'
          onClick={() => geolocation.handleUseLocationText(filters.location || '')}
          disabled={geolocation.isGeocodingLocation}
        >
          {geolocation.isGeocodingLocation ? 'Finding...' : 'Search nearby'}
        </Button>
      )}
      <Button
        className={styles.controlButton}
        variant='outline'
        onClick={geolocation.requestLocation}
        disabled={geolocation.status === 'loading'}
      >
        <MapPin size='1em' aria-hidden='true' className={styles.buttonIcon} />
        {geolocation.status === 'loading'
          ? 'Detecting...'
          : geolocation.hasLocation
            ? 'Update My Location'
            : 'Use My Location'}
      </Button>
      {geolocation.hasLocation && (
        <Button className={styles.controlButton} variant='link' onClick={geolocation.clearLocation}>
          Clear Location
        </Button>
      )}
      <div className={styles.distanceField}>
        <SelectInput
          fullWidth
          label='Distance'
          value={filters.maxDistance?.toString() || ''}
          onChange={(value: string | string[]) => onFilterChange('maxDistance', value as string)}
          options={DISTANCE_OPTIONS}
        />
      </div>
    </div>

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
      <div className={styles.locationStatus({ variant: 'error' })}>{geolocation.geocodeError}</div>
    )}
  </Card>
);
