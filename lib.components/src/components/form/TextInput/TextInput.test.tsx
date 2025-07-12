import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { TextInput } from './TextInput';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('TextInput', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<TextInput />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    renderWithTheme(<TextInput label='Email Address' />);
    const label = screen.getByText('Email Address');
    expect(label).toBeInTheDocument();
  });

  it('displays placeholder when provided', () => {
    renderWithTheme(<TextInput placeholder='Enter your email' />);
    const input = screen.getByPlaceholderText('Enter your email');
    expect(input).toBeInTheDocument();
  });

  it('handles value changes', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(<TextInput onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test value');

    expect(handleChange).toHaveBeenCalled();
  });

  it('shows error state with error message', () => {
    renderWithTheme(<TextInput error='This field is required' />);
    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    renderWithTheme(<TextInput disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('applies different sizes correctly', () => {
    renderWithTheme(<TextInput size='lg' />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('shows helper text when provided', () => {
    renderWithTheme(<TextInput helperText='This is a helper text' />);
    const helperText = screen.getByText('This is a helper text');
    expect(helperText).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<TextInput data-testid='test-input' />);
    const input = screen.getByTestId('test-input');
    expect(input).toBeInTheDocument();
  });

  it('handles focus and blur events', async () => {
    const user = userEvent.setup();
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();

    renderWithTheme(<TextInput onFocus={handleFocus} onBlur={handleBlur} />);
    const input = screen.getByRole('textbox');

    await user.click(input);
    expect(handleFocus).toHaveBeenCalled();

    await user.tab();
    expect(handleBlur).toHaveBeenCalled();
  });
});
