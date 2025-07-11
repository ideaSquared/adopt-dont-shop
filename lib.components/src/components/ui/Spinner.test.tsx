import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { lightTheme } from '../../styles/theme';
import { Spinner } from './Spinner';

import { ThemeProvider as StyledThemeProvider } from 'styled-components';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('Spinner', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    renderWithTheme(<Spinner label='Loading...' />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading...');
  });

  it('applies different sizes correctly', () => {
    renderWithTheme(<Spinner size='lg' data-testid='large-spinner' />);
    const spinner = screen.getByTestId('large-spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('applies different variants correctly', () => {
    renderWithTheme(<Spinner variant='primary' data-testid='primary-spinner' />);
    const spinner = screen.getByTestId('primary-spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Spinner data-testid='test-spinner' />);
    const spinner = screen.getByTestId('test-spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    renderWithTheme(<Spinner className='custom-spinner' />);
    const spinner = screen.getByRole('status').parentElement;
    expect(spinner).toHaveClass('custom-spinner');
  });

  it('combines all props correctly', () => {
    renderWithTheme(
      <Spinner
        size='lg'
        variant='primary'
        label='Loading content...'
        className='custom-class'
        data-testid='combined-spinner'
      />
    );

    const spinner = screen.getByTestId('combined-spinner');
    const spinnerElement = screen.getByRole('status');

    expect(spinner).toBeInTheDocument();
    expect(spinnerElement).toHaveAttribute('aria-label', 'Loading content...');
  });

  it('has proper accessibility attributes', () => {
    renderWithTheme(<Spinner label='Loading data' />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading data');
  });

  it('renders spinner animation element', () => {
    renderWithTheme(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    // Check that it has the proper role for screen readers
    expect(spinner).toHaveAttribute('role', 'status');
  });
});
