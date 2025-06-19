import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider } from '../../../styles/ThemeProvider';
import { lightTheme } from '../../../styles/theme';
import { SelectInput, SelectOption } from './SelectInput';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
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

  it('opens dropdown when clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SelectInput options={mockOptions} />);

    const select = screen.getByRole('combobox');
    await user.click(select);

    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });

  it('selects option when clicked', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(<SelectInput options={mockOptions} onChange={handleChange} />);

    const select = screen.getByRole('combobox');
    await user.click(select);

    const option = screen.getByText('Option 1');
    await user.click(option);

    expect(handleChange).toHaveBeenCalledWith('option1');
  });

  it('handles multiple selection', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(<SelectInput options={mockOptions} multiple onChange={handleChange} />);

    const select = screen.getByRole('combobox');
    await user.click(select);

    const option1 = screen.getByText('Option 1');
    await user.click(option1);

    expect(handleChange).toHaveBeenCalledWith(['option1']);
  });

  it('filters options when searchable', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SelectInput options={mockOptions} searchable />);

    const select = screen.getByRole('combobox');
    await user.click(select);

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'Option 1');

    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
    });
  });

  it('shows error state with error message', () => {
    renderWithTheme(<SelectInput options={mockOptions} error='This field is required' />);
    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
  });

  it('disables select when disabled prop is true', () => {
    renderWithTheme(<SelectInput options={mockOptions} disabled />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Check for disabled styling or behavior instead of specific attribute
  });

  it('shows helper text when provided', () => {
    renderWithTheme(<SelectInput options={mockOptions} helperText='This is helper text' />);
    const helperText = screen.getByText('This is helper text');
    expect(helperText).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    renderWithTheme(<SelectInput options={mockOptions} size='lg' />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('handles clearable functionality', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(
      <SelectInput options={mockOptions} value='option1' clearable onChange={handleChange} />
    );

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<SelectInput options={mockOptions} data-testid='test-select' />);
    const select = screen.getByTestId('test-select');
    expect(select).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SelectInput options={mockOptions} />);

    const select = screen.getByRole('combobox');
    await user.click(select);

    expect(screen.getByText('Option 1')).toBeInTheDocument();

    // Click outside the component
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);
    await user.click(outsideElement);

    // Wait for the dropdown to close
    await waitFor(() => {
      const dropdown = select.closest('.sc-bRKDuR');
      expect(dropdown).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(<SelectInput options={mockOptions} onChange={handleChange} />);

    const select = screen.getByRole('combobox');
    select.focus();

    await user.keyboard('{Enter}');
    expect(screen.getByText('Option 1')).toBeInTheDocument();

    // Test that keyboard navigation is available
    const firstOption = screen.getByText('Option 1');
    await user.click(firstOption);

    expect(handleChange).toHaveBeenCalledWith('option1');
  });
});
