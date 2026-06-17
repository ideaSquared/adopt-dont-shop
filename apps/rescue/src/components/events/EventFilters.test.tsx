import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import type { EventFilter } from '../../types/events';
import EventFilters from './EventFilters';

/**
 * Behaviour tests for the events filter bar. Staff narrow the calendar by type,
 * status and free-text search, switch between list and calendar views, and
 * clear all filters once any is active.
 */
const baseFilters: EventFilter = { type: 'all', status: 'all', searchQuery: '' };

describe('EventFilters', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('emits the chosen event type', () => {
    const onFiltersChange = vi.fn();
    render(
      <EventFilters
        filters={baseFilters}
        onFiltersChange={onFiltersChange}
        view="list"
        onViewChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Event Type'), { target: { value: 'adoption' } });

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'adoption' }));
  });

  it('emits the chosen status', () => {
    const onFiltersChange = vi.fn();
    render(
      <EventFilters
        filters={baseFilters}
        onFiltersChange={onFiltersChange}
        view="list"
        onViewChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'published' } });

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
  });

  it('emits search text as it is typed', () => {
    const onFiltersChange = vi.fn();
    render(
      <EventFilters
        filters={baseFilters}
        onFiltersChange={onFiltersChange}
        view="list"
        onViewChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Search Events'), { target: { value: 'gala' } });

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'gala' }));
  });

  it('hides the clear button when no filters are active', () => {
    render(
      <EventFilters
        filters={baseFilters}
        onFiltersChange={vi.fn()}
        view="list"
        onViewChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Clear All Filters' })).not.toBeInTheDocument();
  });

  it('resets filters when clear is pressed', () => {
    const onFiltersChange = vi.fn();
    render(
      <EventFilters
        filters={{ type: 'adoption', status: 'published', searchQuery: 'x' }}
        onFiltersChange={onFiltersChange}
        view="list"
        onViewChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear All Filters' }));

    expect(onFiltersChange).toHaveBeenCalledWith({ type: 'all', status: 'all', searchQuery: '' });
  });

  it('switches to the calendar view', () => {
    const onViewChange = vi.fn();
    render(
      <EventFilters
        filters={baseFilters}
        onFiltersChange={vi.fn()}
        view="list"
        onViewChange={onViewChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Calendar View/ }));

    expect(onViewChange).toHaveBeenCalledWith('month');
  });
});
