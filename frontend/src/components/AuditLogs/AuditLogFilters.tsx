import React from 'react'
import { FilterConfig, GenericFilters } from '../'
import { AuditLogFilters as AuditLogFiltersType } from '../../libs/audit-logs'

const levelOptions = [
  { value: '', label: 'All Levels' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
]

const auditLogFilterConfig: FilterConfig[] = [
  {
    name: 'search',
    label: 'Search',
    type: 'text',
    placeholder: 'Search actions or services...',
  },
  { name: 'startDate', label: 'Start Date', type: 'date' },
  { name: 'endDate', label: 'End Date', type: 'date' },
  { name: 'level', label: 'Level', type: 'select', options: levelOptions },
  {
    name: 'service',
    label: 'Service',
    type: 'text',
    placeholder: 'Filter by service...',
  },
  {
    name: 'category',
    label: 'Category',
    type: 'text',
    placeholder: 'Filter by category...',
  },
  {
    name: 'user',
    label: 'User',
    type: 'text',
    placeholder: 'Filter by user...',
  },
]

type AuditLogFiltersProps = {
  filters: AuditLogFiltersType
  onFilterChange: (name: string, value: string) => void
}

export const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({
  filters,
  onFilterChange,
}) => (
  <GenericFilters
    filters={filters}
    onFilterChange={onFilterChange}
    filterConfig={auditLogFilterConfig}
  />
)
