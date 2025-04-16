import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import GenericFilters, { FilterConfig } from './GenericFilters'

const meta = {
  title: 'Components/GenericFilters',
  component: GenericFilters,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { onFilterChange: fn() }, // Add action logger for onFilterChange
} satisfies Meta<typeof GenericFilters>

export default meta
type Story = StoryObj<typeof meta>

const sampleFilters: FilterConfig[] = [
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  {
    name: 'search',
    label: 'Search',
    type: 'text',
    placeholder: 'Search items...',
  },
  { name: 'dateRange', label: 'Date Range', type: 'date' },
]

export const Default: Story = {
  args: {
    filterConfig: sampleFilters,
    filters: { status: '', search: '', dateRange: null },
  },
}

export const WithInitialValues: Story = {
  args: {
    filterConfig: sampleFilters,
    filters: {
      status: 'active',
      search: 'example',
      dateRange: new Date(),
    },
  },
}
