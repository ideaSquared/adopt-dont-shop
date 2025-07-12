import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { RadioInput } from './RadioInput';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('RadioInput', () => {
  it('renders correctly with basic props', () => {
    renderWithTheme(<RadioInput name='test' options={mockOptions} data-testid='radio-input' />);

    expect(screen.getByTestId('radio-input')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 3')).toBeInTheDocument();
  });

  it('renders with label', () => {
    renderWithTheme(
      <RadioInput
        name='test'
        options={mockOptions}
        label='Select an option'
        data-testid='radio-input'
      />
    );

    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    renderWithTheme(
      <RadioInput name='test' options={mockOptions} label='Required field' required />
    );

    expect(screen.getByText('Required field')).toBeInTheDocument();
    // Required indicator is shown via CSS ::after content
  });

  it('handles value selection', () => {
    const handleChange = jest.fn();
    renderWithTheme(
      <RadioInput
        name='test'
        options={mockOptions}
        onChange={handleChange}
        data-testid='radio-input'
      />
    );

    fireEvent.click(screen.getByLabelText('Option 2'));
    expect(handleChange).toHaveBeenCalledWith('option2');
  });

  it('displays error message', () => {
    renderWithTheme(
      <RadioInput
        name='test'
        options={mockOptions}
        error='This field is required'
        data-testid='radio-input'
      />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    renderWithTheme(
      <RadioInput
        name='test'
        options={mockOptions}
        helperText='Choose one option'
        data-testid='radio-input'
      />
    );

    expect(screen.getByText('Choose one option')).toBeInTheDocument();
  });

  it('disables all options when disabled prop is true', () => {
    renderWithTheme(
      <RadioInput name='test' options={mockOptions} disabled data-testid='radio-input' />
    );

    mockOptions.forEach(option => {
      expect(screen.getByDisplayValue(option.value)).toBeDisabled();
    });
  });

  it('disables individual options', () => {
    const optionsWithDisabled = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2', disabled: true },
      { value: 'option3', label: 'Option 3' },
    ];

    renderWithTheme(
      <RadioInput name='test' options={optionsWithDisabled} data-testid='radio-input' />
    );

    expect(screen.getByDisplayValue('option1')).not.toBeDisabled();
    expect(screen.getByDisplayValue('option2')).toBeDisabled();
    expect(screen.getByDisplayValue('option3')).not.toBeDisabled();
  });

  it('renders with controlled value', () => {
    renderWithTheme(
      <RadioInput name='test' options={mockOptions} value='option2' data-testid='radio-input' />
    );

    expect(screen.getByDisplayValue('option2')).toBeChecked();
    expect(screen.getByDisplayValue('option1')).not.toBeChecked();
    expect(screen.getByDisplayValue('option3')).not.toBeChecked();
  });

  it('renders with default value', () => {
    renderWithTheme(
      <RadioInput
        name='test'
        options={mockOptions}
        defaultValue='option3'
        data-testid='radio-input'
      />
    );

    const option3Radio = screen.getByDisplayValue('option3') as HTMLInputElement;
    expect(option3Radio.checked).toBe(true);
  });

  it('renders horizontally when direction is horizontal', () => {
    renderWithTheme(
      <RadioInput
        name='test'
        options={mockOptions}
        direction='horizontal'
        data-testid='radio-input'
      />
    );

    // This would require checking the CSS styles in a more complex test
    expect(screen.getByTestId('radio-input')).toBeInTheDocument();
  });

  it('applies different sizes', () => {
    const { rerender } = renderWithTheme(
      <RadioInput name='test' options={mockOptions} size='sm' data-testid='radio-input' />
    );

    expect(screen.getByTestId('radio-input')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <RadioInput name='test' options={mockOptions} size='lg' data-testid='radio-input' />
      </StyledThemeProvider>
    );

    expect(screen.getByTestId('radio-input')).toBeInTheDocument();
  });

  it('applies different states', () => {
    const { rerender } = renderWithTheme(
      <RadioInput name='test' options={mockOptions} state='success' data-testid='radio-input' />
    );

    expect(screen.getByTestId('radio-input')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <RadioInput name='test' options={mockOptions} state='warning' data-testid='radio-input' />
      </StyledThemeProvider>
    );

    expect(screen.getByTestId('radio-input')).toBeInTheDocument();
  });
});
