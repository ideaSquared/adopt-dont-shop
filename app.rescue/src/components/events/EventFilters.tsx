import React from 'react';
import styled from 'styled-components';
import { EventType, EventStatus, EventFilter, CalendarView } from '../../types/events';

interface EventFiltersProps {
  filters: EventFilter;
  onFiltersChange: (filters: EventFilter) => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const FiltersContainer = styled.div`
  background: white;
  border: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.theme.colors.neutral?.[300] || '#d1d5db'};
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: ${props => props.theme.text?.primary || '#111827'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary?.[500] || '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary?.[100] || '#dbeafe'};
  }

  &:hover {
    border-color: ${props => props.theme.colors.neutral?.[400] || '#9ca3af'};
  }
`;

const SearchInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.theme.colors.neutral?.[300] || '#d1d5db'};
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: ${props => props.theme.text?.primary || '#111827'};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary?.[500] || '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary?.[100] || '#dbeafe'};
  }

  &::placeholder {
    color: ${props => props.theme.text?.secondary || '#9ca3af'};
  }
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
`;

const ViewButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.theme.colors.neutral?.[300] || '#d1d5db'};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  background: ${props => (props.$active ? props.theme.colors.primary?.[500] || '#3b82f6' : 'white')};
  color: ${props => (props.$active ? 'white' : props.theme.text?.primary || '#111827')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props =>
      props.$active
        ? props.theme.colors.primary?.[600] || '#2563eb'
        : props.theme.colors.neutral?.[100] || '#f3f4f6'};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary?.[100] || '#dbeafe'};
  }
`;

const ClearButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  color: ${props => props.theme.colors.primary?.[600] || '#2563eb'};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    text-decoration: underline;
  }
`;

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
    <FiltersContainer>
      <FiltersGrid>
        <FilterGroup>
          <Label htmlFor="event-type">Event Type</Label>
          <Select id="event-type" value={filters.type || 'all'} onChange={handleTypeChange}>
            <option value="all">All Types</option>
            <option value="adoption">Adoption Events</option>
            <option value="fundraising">Fundraising</option>
            <option value="volunteer">Volunteer Events</option>
            <option value="community">Community Outreach</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <Label htmlFor="event-status">Status</Label>
          <Select id="event-status" value={filters.status || 'all'} onChange={handleStatusChange}>
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <Label htmlFor="event-search">Search Events</Label>
          <SearchInput
            id="event-search"
            type="text"
            placeholder="Search by name or description..."
            value={filters.searchQuery || ''}
            onChange={handleSearchChange}
          />
        </FilterGroup>

        {hasActiveFilters && (
          <FilterGroup style={{ justifyContent: 'flex-end' }}>
            <Label>&nbsp;</Label>
            <ClearButton onClick={handleClearFilters}>Clear All Filters</ClearButton>
          </FilterGroup>
        )}
      </FiltersGrid>

      <ViewToggle>
        <ViewButton $active={view === 'list'} onClick={() => onViewChange('list')}>
          📋 List View
        </ViewButton>
        <ViewButton $active={view === 'month'} onClick={() => onViewChange('month')}>
          📅 Calendar View
        </ViewButton>
      </ViewToggle>
    </FiltersContainer>
  );
};

export default EventFilters;
