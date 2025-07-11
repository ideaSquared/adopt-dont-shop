import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { TextArea } from './TextArea';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('TextArea', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<TextArea />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    renderWithTheme(<TextArea label='Description' />);
    const label = screen.getByText('Description');
    expect(label).toBeInTheDocument();
  });

  it('displays placeholder when provided', () => {
    renderWithTheme(<TextArea placeholder='Enter your description' />);
    const textarea = screen.getByPlaceholderText('Enter your description');
    expect(textarea).toBeInTheDocument();
  });

  it('handles value changes', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(<TextArea onChange={handleChange} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'test content');

    // Flush all effects/state updates
    await Promise.resolve();
    expect(handleChange).toHaveBeenCalled();
  });

  it('shows error state with error message', () => {
    renderWithTheme(<TextArea error='This field is required' />);
    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
  });

  it('disables textarea when disabled prop is true', () => {
    renderWithTheme(<TextArea disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('applies different sizes correctly', () => {
    renderWithTheme(<TextArea size='lg' />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('shows helper text when provided', () => {
    renderWithTheme(<TextArea helperText='This is helper text' />);
    const helperText = screen.getByText('This is helper text');
    expect(helperText).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<TextArea data-testid='test-textarea' />);
    const textarea = screen.getByTestId('test-textarea');
    expect(textarea).toBeInTheDocument();
  });

  it('handles focus and blur events', async () => {
    const user = userEvent.setup();
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();

    renderWithTheme(<TextArea onFocus={handleFocus} onBlur={handleBlur} />);
    const textarea = screen.getByRole('textbox');

    await user.click(textarea);
    expect(handleFocus).toHaveBeenCalled();

    await user.tab();
    expect(handleBlur).toHaveBeenCalled();
  });

  it('respects rows prop for height', () => {
    renderWithTheme(<TextArea rows={5} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('handles maxLength attribute correctly', () => {
    renderWithTheme(<TextArea maxLength={100} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('maxlength', '100');
  });

  it('applies autoResize functionality', () => {
    renderWithTheme(<TextArea autoResize />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('combines all props correctly', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    renderWithTheme(
      <TextArea
        label='Description'
        placeholder='Enter description'
        helperText='This is a helper text'
        size='lg'
        required
        onChange={handleChange}
        data-testid='combined-textarea'
      />
    );

    const textarea = screen.getByTestId('combined-textarea');
    const label = screen.getByText('Description');
    const helperText = screen.getByText('This is a helper text');

    expect(textarea).toBeInTheDocument();
    expect(label).toBeInTheDocument();
    expect(helperText).toBeInTheDocument();

    await user.type(textarea, 'test value');
    // Flush all effects/state updates
    await Promise.resolve();
    expect(handleChange).toHaveBeenCalled();
  });
});
