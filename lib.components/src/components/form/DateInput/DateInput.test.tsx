import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { DateInput } from './DateInput';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('DateInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders correctly with default props', () => {
    renderWithTheme(<DateInput value='' onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'date');
  });

  it('displays the correct value', () => {
    renderWithTheme(<DateInput value='2024-01-15' onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('2024-01-15');
    expect(input).toHaveValue('2024-01-15');
  });

  it('calls onChange when date is changed', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DateInput value='' onChange={mockOnChange} />);

    const input = screen.getByDisplayValue('');
    await user.clear(input);
    await user.type(input, '2024-01-15');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('applies disabled state correctly', () => {
    renderWithTheme(<DateInput value='' onChange={mockOnChange} disabled />);
    const input = screen.getByDisplayValue('');
    expect(input).toBeDisabled();
  });

  it('accepts min and max date constraints', () => {
    renderWithTheme(
      <DateInput value='' onChange={mockOnChange} min='2024-01-01' max='2024-12-31' />
    );
    const input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('min', '2024-01-01');
    expect(input).toHaveAttribute('max', '2024-12-31');
  });

  it('applies id attribute when provided', () => {
    renderWithTheme(<DateInput value='' onChange={mockOnChange} id='test-date' />);
    const input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('id', 'test-date');
  });

  it('has proper styling when focused', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DateInput value='' onChange={mockOnChange} />);

    const input = screen.getByDisplayValue('');
    await user.click(input);

    expect(input).toHaveFocus();
  });
});
