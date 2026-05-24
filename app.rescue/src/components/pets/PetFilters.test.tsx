import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../test-utils';
import PetFilters from './PetFilters';

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
