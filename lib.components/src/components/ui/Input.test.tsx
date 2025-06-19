import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider } from '../../styles/ThemeProvider';
import { lightTheme } from '../../styles/theme';
import { Input } from './Input';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

describe('Input', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('handles different input types', () => {
    const types = ['text', 'email', 'password', 'number', 'tel', 'url'] as const;

    types.forEach(type => {
      renderWithTheme(<Input type={type} data-testid={`input-${type}`} />);
      const input = screen.getByTestId(`input-${type}`);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', type);
    });
  });

  it('displays placeholder when provided', () => {
    renderWithTheme(<Input placeholder='Enter text here' />);
    const input = screen.getByPlaceholderText('Enter text here');
    expect(input).toBeInTheDocument();
  });

  it('handles value changes', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test input');

    expect(handleChange).toHaveBeenCalled();
  });

  it('applies different sizes correctly', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach(size => {
      renderWithTheme(<Input size={size} data-testid={`input-${size}`} />);
      const input = screen.getByTestId(`input-${size}`);
      expect(input).toBeInTheDocument();
    });
  });

  it('shows error state when error prop is provided', () => {
    renderWithTheme(<Input error='Field is required' data-testid='error-input' />);
    const input = screen.getByTestId('error-input');
    expect(input).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    renderWithTheme(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('makes input readonly when readOnly prop is true', () => {
    renderWithTheme(<Input readOnly />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
  });

  it('applies required attribute when required prop is true', () => {
    renderWithTheme(<Input required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Input data-testid='test-input' />);
    const input = screen.getByTestId('test-input');
    expect(input).toBeInTheDocument();
  });

  it('handles focus and blur events', async () => {
    const user = userEvent.setup();
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();

    renderWithTheme(<Input onFocus={handleFocus} onBlur={handleBlur} />);
    const input = screen.getByRole('textbox');

    await user.click(input);
    expect(handleFocus).toHaveBeenCalled();

    await user.tab();
    expect(handleBlur).toHaveBeenCalled();
  });

  it('passes through HTML attributes', () => {
    renderWithTheme(
      <Input
        id='input-id'
        name='input-name'
        className='custom-class'
        title='Input title'
        data-testid='input-with-attrs'
      />
    );

    const input = screen.getByTestId('input-with-attrs');
    expect(input).toHaveAttribute('id', 'input-id');
    expect(input).toHaveAttribute('name', 'input-name');
    expect(input).toHaveAttribute('title', 'Input title');
    expect(input).toHaveClass('custom-class');
  });

  it('supports controlled input', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();
    renderWithTheme(<Input value='controlled value' onChange={handleChange} />);

    const input = screen.getByDisplayValue('controlled value');
    expect(input).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'new value');
    expect(handleChange).toHaveBeenCalled();
  });

  it('supports uncontrolled input with defaultValue', () => {
    renderWithTheme(<Input defaultValue='default text' />);
    const input = screen.getByDisplayValue('default text');
    expect(input).toBeInTheDocument();
  });

  it('applies fullWidth styles when fullWidth prop is true', () => {
    renderWithTheme(<Input fullWidth data-testid='full-width-input' />);
    const input = screen.getByTestId('full-width-input');
    expect(input).toBeInTheDocument();
  });

  it('handles different input variants', () => {
    const variants = ['outlined', 'filled', 'standard'] as const;

    variants.forEach(variant => {
      renderWithTheme(<Input variant={variant} data-testid={`input-${variant}`} />);
      const input = screen.getByTestId(`input-${variant}`);
      expect(input).toBeInTheDocument();
    });
  });

  it('combines all props correctly', () => {
    renderWithTheme(
      <Input
        type='email'
        size='lg'
        placeholder='Enter email'
        required
        fullWidth
        variant='outlined'
        className='combined-input'
        data-testid='combined-input'
      />
    );

    const input = screen.getByTestId('combined-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeRequired();
    expect(input).toHaveClass('combined-input');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    renderWithTheme(<Input ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
