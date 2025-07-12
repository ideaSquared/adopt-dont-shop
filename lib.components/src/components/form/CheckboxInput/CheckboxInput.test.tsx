import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { CheckboxInput } from './CheckboxInput';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('CheckboxInput', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<CheckboxInput />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    renderWithTheme(<CheckboxInput label='Accept terms' />);
    const label = screen.getByText('Accept terms');
    expect(label).toBeInTheDocument();
  });

  it('handles checked state correctly', () => {
    renderWithTheme(<CheckboxInput checked onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('handles unchecked state correctly', () => {
    renderWithTheme(<CheckboxInput checked={false} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('handles change events', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(<CheckboxInput onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalled();
  });

  it('disables checkbox when disabled prop is true', () => {
    renderWithTheme(<CheckboxInput disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('shows error state with error message', () => {
    renderWithTheme(<CheckboxInput error='This field is required' />);
    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<CheckboxInput data-testid='test-checkbox' />);
    const checkbox = screen.getByTestId('test-checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    renderWithTheme(<CheckboxInput size='lg' label='Large checkbox' />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('handles intermediate state correctly', () => {
    renderWithTheme(<CheckboxInput indeterminate />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });
});
