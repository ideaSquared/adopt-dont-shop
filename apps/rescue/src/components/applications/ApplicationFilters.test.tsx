import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ApplicationFilters from './ApplicationFilters';

const EMPTY_FILTERS = {
  search: '',
  status: '',
  priority: '',
  petType: '',
  referencesStatus: '',
  homeVisitStatus: '',
  dateRange: '',
  petBreed: '',
};

const renderFilters = () => {
  const onFilterChange = vi.fn();
  const onClearFilters = vi.fn();
  render(
    <ApplicationFilters
      filters={EMPTY_FILTERS}
      onFilterChange={onFilterChange}
      onClearFilters={onClearFilters}
    />
  );
  return { onFilterChange, onClearFilters };
};

describe('ApplicationFilters', () => {
  it('reports the search text and the breed text', () => {
    const { onFilterChange } = renderFilters();

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'jane' } });
    fireEvent.change(screen.getByLabelText('Pet Breed'), { target: { value: 'lab' } });

    expect(onFilterChange).toHaveBeenCalledWith('search', 'jane');
    expect(onFilterChange).toHaveBeenCalledWith('petBreed', 'lab');
  });

  it.each([
    ['Status', 'approved', 'status'],
    ['Priority', 'high', 'priority'],
    ['Pet Type', 'Dog', 'petType'],
    ['References', 'completed', 'referencesStatus'],
    ['Home Visit', 'scheduled', 'homeVisitStatus'],
    ['Date Range', 'week', 'dateRange'],
  ])('reports a %s choice', (label, value, key) => {
    const { onFilterChange } = renderFilters();

    fireEvent.change(screen.getByLabelText(label), { target: { value } });

    expect(onFilterChange).toHaveBeenCalledWith(key, value);
  });

  it('offers the application statuses with their shared labels', () => {
    renderFilters();

    expect(screen.getByRole('option', { name: 'Submitted' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Withdrawn' })).toBeInTheDocument();
  });

  it('clears the filters', () => {
    const { onClearFilters } = renderFilters();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));

    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
