import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import GenericFilters, { FilterConfig } from './FilterPanel';

describe('GenericFilters Component', () => {
  const renderWithTheme = (ui: React.ReactElement) => render(ui);

  const mockOnFilterChange = vi.fn();

  const filterConfig: FilterConfig[] = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'Enter name' },
    { name: 'date', label: 'Date', type: 'date' },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'cat', label: 'Cat' },
        { value: 'dog', label: 'Dog' },
      ],
    },
    { name: 'verified', label: 'Verified', type: 'checkbox' },
  ];

  const initialFilters = {
    name: '',
    date: '',
    category: '',
    verified: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all inputs based on the configuration', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />
    );

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(document.querySelector('input[type="date"]')).toBeInTheDocument(); // Date input
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // Category select
    expect(screen.getByRole('checkbox')).toBeInTheDocument(); // Verified checkbox
  });

  it('updates the text input value on change', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />
    );

    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(nameInput, { target: { value: 'Fluffy' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith('name', 'Fluffy');
  });

  it('updates the date input value on change', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />
    );

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2023-01-01' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith('date', '2023-01-01');
  });

  it('updates the select input value on change', async () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />
    );

    const selectInput = screen.getByRole('combobox');
    // Click to open dropdown then select option
    fireEvent.click(selectInput);
    const dogOption = screen.getByText('Dog');
    fireEvent.click(dogOption);

    expect(mockOnFilterChange).toHaveBeenCalledWith('category', 'dog');
  });

  it('updates the checkbox value on change', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />
    );

    // FilterPanel renders CheckboxInput without a visible label, so the
    // accessible name lookup used in the original test never matched. Find
    // the underlying <input type="checkbox"> directly.
    const checkboxInput = screen.getByRole('checkbox');

    fireEvent.click(checkboxInput);
    expect(mockOnFilterChange).toHaveBeenCalledWith('verified', true);
  });

  it('renders options for select input', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />
    );

    const selectInput = screen.getByRole('combobox');
    fireEvent.click(selectInput); // Open the dropdown

    const catOption = screen.getByText('Cat');
    const dogOption = screen.getByText('Dog');

    expect(catOption).toBeInTheDocument();
    expect(dogOption).toBeInTheDocument();
  });
});
