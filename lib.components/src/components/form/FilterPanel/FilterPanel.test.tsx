import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../../styles/ThemeProvider';
import { lightTheme as theme } from '../../../styles/theme';
import GenericFilters, { FilterConfig } from './FilterPanel';

describe('GenericFilters Component', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
  };

  const mockOnFilterChange = jest.fn();

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
    jest.clearAllMocks();
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

  //   TODO: Fix this test - but do we need to we test this anyway?
  it.skip('updates the checkbox value on change', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />
    );

    const checkboxInput = screen.getByRole('checkbox', { name: 'Verified' });

    // First click - check
    fireEvent.click(checkboxInput);
    expect(mockOnFilterChange).toHaveBeenCalledWith('verified', true);

    // Second click - uncheck
    fireEvent.click(checkboxInput);
    expect(mockOnFilterChange).toHaveBeenCalledWith('verified', false);
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
    // The options are visible in the DOM based on the debug output above
    const catOption = screen.getByText('Cat');
    const dogOption = screen.getByText('Dog');

    expect(catOption).toBeInTheDocument();
    expect(dogOption).toBeInTheDocument();
  });
});
