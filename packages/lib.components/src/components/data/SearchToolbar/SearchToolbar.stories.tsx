import type { Meta, StoryObj } from '@storybook/react';

import { SearchToolbar, type FilterConfig, type SearchToolbarActiveFilter } from './SearchToolbar';

const noop = () => undefined;

const filterConfig: FilterConfig[] = [
  { name: 'species', label: 'Species', type: 'text', placeholder: 'Any species' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'available', label: 'Available' },
      { value: 'pending', label: 'Pending' },
      { value: 'adopted', label: 'Adopted' },
    ],
  },
];

const activeFilters: SearchToolbarActiveFilter[] = [
  { name: 'species', label: 'Species', value: 'Dog' },
  { name: 'status', label: 'Status', value: 'Available' },
];

const meta: Meta<typeof SearchToolbar> = {
  title: 'Components/Data/SearchToolbar',
  component: SearchToolbar,
  tags: ['autodocs'],
  args: {
    searchValue: '',
    onSearchChange: noop,
    onFilterChange: noop,
    onRemoveFilter: noop,
    searchPlaceholder: 'Search pets…',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { searchLabel: 'Search pets', resultCount: 42 },
};

export const WithActiveFilters: Story = {
  args: {
    searchLabel: 'Search pets',
    searchValue: 'labrador',
    activeFilters,
    resultCount: 3,
  },
};

export const WithFilterPanel: Story = {
  args: {
    searchLabel: 'Search pets',
    filterConfig,
    filters: { species: 'Dog', status: 'available' },
    activeFilters,
    resultCount: 12,
  },
};

export const NoResults: Story = {
  args: {
    searchLabel: 'Search pets',
    searchValue: 'unicorn',
    activeFilters: [{ name: 'species', label: 'Species', value: 'Unicorn' }],
    resultCount: 0,
  },
};

export const CustomNoun: Story = {
  args: {
    searchLabel: 'Search applications',
    resultCount: 1,
    resultNoun: 'application',
  },
};

export const FilterOnly: Story = {
  args: {
    searchValue: undefined,
    onSearchChange: undefined,
    filterConfig,
    filters: { species: '', status: 'available' },
  },
};
