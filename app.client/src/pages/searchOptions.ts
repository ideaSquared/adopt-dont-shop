// Static option lists used by the search page filter UI. Extracting these
// out of SearchPage.tsx keeps the page component focused on data flow and
// lets us unit-test the option shapes independently.

export type FilterOption = { value: string; label: string };

export const DISTANCE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Any Distance' },
  { value: '10', label: 'Within 10 miles' },
  { value: '25', label: 'Within 25 miles' },
  { value: '50', label: 'Within 50 miles' },
  { value: '100', label: 'Within 100 miles' },
  { value: '250', label: 'Within 250 miles' },
];

export const PET_TYPES: FilterOption[] = [
  { value: '', label: 'All Types' },
  { value: 'dog', label: 'Dogs' },
  { value: 'cat', label: 'Cats' },
  { value: 'rabbit', label: 'Rabbits' },
  { value: 'bird', label: 'Birds' },
  { value: 'other', label: 'Other' },
];

export const PET_SIZES: FilterOption[] = [
  { value: '', label: 'All Sizes' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra_large', label: 'Extra Large' },
];

export const PET_GENDERS: FilterOption[] = [
  { value: '', label: 'All Genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const AGE_GROUPS: FilterOption[] = [
  { value: '', label: 'All Ages' },
  { value: 'young', label: 'Young' },
  { value: 'adult', label: 'Adult' },
  { value: 'senior', label: 'Senior' },
];

export const PET_STATUS: FilterOption[] = [
  { value: '', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Pending' },
  { value: 'adopted', label: 'Adopted' },
];

export const SORT_OPTIONS: FilterOption[] = [
  { value: 'createdAt:desc', label: 'Newest First' },
  { value: 'createdAt:asc', label: 'Oldest First' },
  { value: 'distance:asc', label: 'Distance: Nearest First' },
  { value: 'name:asc', label: 'Name A-Z' },
  { value: 'name:desc', label: 'Name Z-A' },
  { value: 'ageYears:asc', label: 'Youngest First' },
  { value: 'ageYears:desc', label: 'Oldest First' },
  { value: 'adoptionFee:asc', label: 'Price Low to High' },
  { value: 'adoptionFee:desc', label: 'Price High to Low' },
];

/**
 * Returns true if the given `sortBy` URL param matches the sort prefix of any
 * sort option. Used by SearchPage to validate sort params from the URL before
 * trusting them.
 */
export const isKnownSortBy = (value: string | null | undefined): boolean => {
  if (!value) {
    return false;
  }
  return SORT_OPTIONS.some(o => o.value.startsWith(`${value}:`));
};

/**
 * Returns true if the given `sortOrder` URL param is one of the two valid
 * orderings. Used by SearchPage to validate order params from the URL.
 */
export const isKnownSortOrder = (value: string | null | undefined): value is 'asc' | 'desc' =>
  value === 'asc' || value === 'desc';
