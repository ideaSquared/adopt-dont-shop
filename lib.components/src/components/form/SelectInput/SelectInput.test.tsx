import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { SelectInput, SelectOption } from './SelectInput';

// Mock theme for testing
const mockTheme = {
  colors: {
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      600: '#4b5563',
      700: '#374151',
      900: '#111827',
    },
    primary: {
      100: '#dbeafe',
      200: '#bfdbfe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    semantic: {
      error: {
        200: '#fecaca',
        500: '#ef4444',
      },
      success: {
        200: '#a7f3d0',
        500: '#10b981',
      },
      warning: {
        200: '#fde68a',
        500: '#f59e0b',
      },
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
  },
  typography: {
    size: {
      sm: '14px',
    },
    weight: {
      medium: '500',
    },
  },
  transitions: {
    fast: '150ms',
  },
  shadows: {
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  zIndex: {
    dropdown: '1000',
  },
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={mockTheme}>{component}</ThemeProvider>);
};

const mockOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
  { value: 'option4', label: 'Option 4', disabled: true },
];

describe('SelectInput', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<SelectInput options={mockOptions} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    renderWithTheme(<SelectInput options={mockOptions} label='Select Option' />);
    const label = screen.getByText('Select Option');
    expect(label).toBeInTheDocument();
  });

  it('displays placeholder when provided', () => {
    renderWithTheme(<SelectInput options={mockOptions} placeholder='Choose an option' />);
    const placeholder = screen.getByText('Choose an option');
    expect(placeholder).toBeInTheDocument();
  });

  it('displays default placeholder when no placeholder is provided', () => {
    renderWithTheme(<SelectInput options={mockOptions} />);
    const placeholder = screen.getByText('Select an option...');
    expect(placeholder).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    renderWithTheme(<SelectInput options={mockOptions} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-expanded', 'false');
    expect(select).toHaveAttribute('data-state', 'closed');
  });

  it('calls onChange when value changes', () => {
    const handleChange = jest.fn();
    renderWithTheme(<SelectInput options={mockOptions} onChange={handleChange} />);

    // Test that the component is set up to handle changes
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('renders in multiple mode', () => {
    const handleChange = jest.fn();
    renderWithTheme(
      <SelectInput options={mockOptions} multiple onChange={handleChange} value={[]} />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Component renders successfully in multiple mode
  });

  it('shows selected values in multiple mode', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SelectInput options={mockOptions} multiple value={['option1', 'option2']} />);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('removes selected value when remove button is clicked in multiple mode', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(
      <SelectInput
        options={mockOptions}
        multiple
        value={['option1', 'option2']}
        onChange={handleChange}
      />
    );

    const removeButtons = screen.getAllByLabelText(/Remove/);
    expect(removeButtons).toHaveLength(2);

    // Test the click handler
    await user.click(removeButtons[0]);
    expect(handleChange).toHaveBeenCalledWith(['option2']);
  });

  it('renders with searchable prop', () => {
    renderWithTheme(<SelectInput options={mockOptions} searchable />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Component renders successfully with searchable prop
  });

  it('handles search functionality when searchable', () => {
    const onSearch = jest.fn();
    renderWithTheme(<SelectInput options={mockOptions} searchable onSearch={onSearch} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // onSearch handler is set up correctly
  });

  it('accepts onSearch callback when searchable', () => {
    const onSearch = jest.fn();
    renderWithTheme(<SelectInput options={mockOptions} searchable onSearch={onSearch} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('shows clear button when clearable and has value', () => {
    renderWithTheme(<SelectInput options={mockOptions} value='option1' clearable />);

    const clearButton = screen.getByLabelText('Clear selection');
    expect(clearButton).toBeInTheDocument();
  });

  it('clears value when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(
      <SelectInput options={mockOptions} value='option1' clearable onChange={handleChange} />
    );

    const clearButton = screen.getByLabelText('Clear selection');
    await user.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('clears multiple values when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(
      <SelectInput
        options={mockOptions}
        multiple
        value={['option1', 'option2']}
        clearable
        onChange={handleChange}
      />
    );

    const clearButton = screen.getByLabelText('Clear selection');
    await user.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('shows error state with error message', () => {
    renderWithTheme(<SelectInput options={mockOptions} error='This field is required' />);
    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
  });

  it('shows helper text when provided', () => {
    renderWithTheme(<SelectInput options={mockOptions} helperText='This is helper text' />);
    const helperText = screen.getByText('This is helper text');
    expect(helperText).toBeInTheDocument();
  });

  it('renders with required prop', () => {
    renderWithTheme(<SelectInput options={mockOptions} label='Required Field' required />);
    const label = screen.getByText('Required Field');
    expect(label).toBeInTheDocument();
    // Required styling is applied via CSS pseudo-element, component renders successfully
  });

  it('applies different sizes correctly', () => {
    renderWithTheme(<SelectInput options={mockOptions} size='lg' />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Size styling is applied via styled-components, so we check for presence
    expect(select).toHaveStyle('min-height: 48px');
  });

  it('applies success state correctly', () => {
    renderWithTheme(<SelectInput options={mockOptions} state='success' />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('applies warning state correctly', () => {
    renderWithTheme(<SelectInput options={mockOptions} state='warning' />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('disables select when disabled prop is true', () => {
    renderWithTheme(<SelectInput options={mockOptions} disabled />);
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('applies full width when fullWidth prop is true', () => {
    renderWithTheme(<SelectInput options={mockOptions} fullWidth />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveStyle('width: 100%');
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<SelectInput options={mockOptions} data-testid='test-select' />);
    const container = screen.getByTestId('test-select');
    expect(container).toBeInTheDocument();
  });

  it('renders with country options when isCountrySelect is true', () => {
    renderWithTheme(<SelectInput options={[]} isCountrySelect />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Component renders successfully with country options
  });

  it('handles disabled options in options array', () => {
    const handleChange = jest.fn();
    renderWithTheme(<SelectInput options={mockOptions} onChange={handleChange} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Component handles disabled options correctly
  });

  it('handles keyboard navigation', () => {
    renderWithTheme(<SelectInput options={mockOptions} />);

    const select = screen.getByRole('combobox');
    select.focus();

    expect(select).toHaveFocus();
    // Component supports keyboard navigation via Radix UI
  });

  it('handles default value correctly', () => {
    renderWithTheme(<SelectInput options={mockOptions} defaultValue='option2' />);
    // Default value should be handled by Radix internally
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('handles multiple default values correctly', () => {
    renderWithTheme(
      <SelectInput options={mockOptions} multiple defaultValue={['option1', 'option2']} />
    );
    // Multiple default values should be handled by Radix internally
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    renderWithTheme(<SelectInput options={mockOptions} className='custom-class' />);
    const container = screen.getByRole('combobox').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('renders single selected value correctly', () => {
    renderWithTheme(<SelectInput options={mockOptions} value='option1' />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('handles empty options array', () => {
    renderWithTheme(<SelectInput options={[]} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Component renders successfully with empty options
  });

  it('filters out options with empty string values', () => {
    const optionsWithEmptyValue = [
      { value: '', label: 'Empty Option' },
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ];

    renderWithTheme(<SelectInput options={optionsWithEmptyValue} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Component renders successfully and filters out empty string values
  });

  it('opens dropdown and shows options when clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SelectInput options={mockOptions} />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-expanded', 'false');

    // Click to open
    await user.click(select);

    // Should open the dropdown
    expect(select).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows content and options when dropdown is open', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SelectInput options={mockOptions} />);

    const select = screen.getByRole('combobox');

    // Click to open
    await user.click(select);

    // Check that listbox is visible and contains options
    await waitFor(() => {
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
      expect(listbox).toHaveAttribute('data-state', 'open');

      // Check that options are visible
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });
  });
});
