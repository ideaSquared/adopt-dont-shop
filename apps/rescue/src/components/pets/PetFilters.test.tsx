import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { within } from '@testing-library/react';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../test-utils';
import PetFilters from './PetFilters';
import PetFormModal from './PetFormModal';

const defaultFilters = {
  search: '',
  type: '',
  status: '',
  size: '',
  breed: '',
  ageGroup: '',
  gender: '',
};

describe('PetFilters auto-apply behaviour', () => {
  let onFilterChange: ReturnType<typeof vi.fn>;
  let onClearFilters: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onFilterChange = vi.fn();
    onClearFilters = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render an Apply Filters button', () => {
    renderWithProviders(
      <PetFilters
        filters={defaultFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
      />
    );
    expect(screen.queryByRole('button', { name: /apply filters/i })).not.toBeInTheDocument();
  });

  it('renders a Clear Filters button', () => {
    renderWithProviders(
      <PetFilters
        filters={defaultFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
      />
    );
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('debounces search input and fires onFilterChange after 300ms', async () => {
    renderWithProviders(
      <PetFilters
        filters={defaultFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
      />
    );

    const searchInput = screen.getByLabelText('Search');
    fireEvent.change(searchInput, { target: { value: 'labrador' } });

    // Not called immediately
    expect(onFilterChange).not.toHaveBeenCalledWith('search', 'labrador');

    // Called after debounce
    vi.advanceTimersByTime(300);
    expect(onFilterChange).toHaveBeenCalledWith('search', 'labrador');
  });

  it('debounces breed input and fires onFilterChange after 300ms', async () => {
    renderWithProviders(
      <PetFilters
        filters={defaultFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
      />
    );

    const breedInput = screen.getByLabelText('Breed');
    fireEvent.change(breedInput, { target: { value: 'golden' } });

    expect(onFilterChange).not.toHaveBeenCalledWith('breed', 'golden');

    vi.advanceTimersByTime(300);
    expect(onFilterChange).toHaveBeenCalledWith('breed', 'golden');
  });

  it('applies select filter changes immediately without debounce', () => {
    renderWithProviders(
      <PetFilters
        filters={defaultFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
      />
    );

    const typeSelect = screen.getByLabelText('Pet Type');
    fireEvent.change(typeSelect, { target: { value: 'dog' } });

    expect(onFilterChange).toHaveBeenCalledWith('type', 'dog');
  });
});

describe('PetFilters alongside the add-pet form', () => {
  // The pets page renders the filters and, when adding a pet, the form at the
  // same time. Each label must still point at its own control.
  it("keeps the form's labels pointing at the form's own fields", () => {
    renderWithProviders(
      <>
        <PetFilters filters={defaultFilters} onFilterChange={vi.fn()} onClearFilters={vi.fn()} />
        <PetFormModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
      </>
    );

    const form = screen.getByRole('button', { name: /add pet/i }).closest('form');
    if (!form) {
      throw new Error('add-pet form not rendered');
    }
    const formFields = within(form);
    for (const label of [/^pet type/i, /^size/i, /^primary breed/i, /^gender/i]) {
      expect(form).toContainElement(
        formFields.getByLabelText(label, { selector: 'input, select' })
      );
    }
  });
});
