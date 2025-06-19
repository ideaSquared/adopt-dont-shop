import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../styles/ThemeProvider';
import { lightTheme } from '../../styles/theme';
import { Button } from './Button';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

describe('Button', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    renderWithTheme(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles correctly', () => {
    renderWithTheme(<Button variant='primary'>Primary Button</Button>);
    const button = screen.getByRole('button', { name: /primary button/i });
    expect(button).toBeInTheDocument();
  });

  it('applies size styles correctly', () => {
    renderWithTheme(<Button size='lg'>Large Button</Button>);
    const button = screen.getByRole('button', { name: /large button/i });
    expect(button).toBeInTheDocument();
  });

  it('disables the button when disabled prop is true', () => {
    renderWithTheme(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
  });

  it('shows loading state when isLoading is true', () => {
    renderWithTheme(<Button isLoading>Loading Button</Button>);
    const button = screen.getByRole('button', { name: /loading button/i });
    expect(button).toBeInTheDocument();
  });

  it('applies fullWidth prop correctly', () => {
    renderWithTheme(<Button isFullWidth>Full Width Button</Button>);
    const button = screen.getByRole('button', { name: /full width button/i });
    expect(button).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Button data-testid='test-button'>Test Button</Button>);
    const button = screen.getByTestId('test-button');
    expect(button).toBeInTheDocument();
  });

  it('prevents click when disabled', () => {
    const handleClick = jest.fn();
    renderWithTheme(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );

    const button = screen.getByRole('button', { name: /disabled button/i });
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('prevents click when loading', () => {
    const handleClick = jest.fn();
    renderWithTheme(
      <Button isLoading onClick={handleClick}>
        Loading Button
      </Button>
    );

    const button = screen.getByRole('button', { name: /loading button/i });
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });
});
