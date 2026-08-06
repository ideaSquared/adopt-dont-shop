import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ErrorState } from './ErrorState';

const renderWithTheme = (component: React.ReactElement) => render(component);

describe('ErrorState', () => {
  it('renders the default title when none is provided', () => {
    renderWithTheme(<ErrorState data-testid='error-state' />);

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders a custom title and message', () => {
    renderWithTheme(
      <ErrorState
        title='Failed to load pets'
        message='The server did not respond in time.'
        data-testid='error-state'
      />
    );

    expect(screen.getByText('Failed to load pets')).toBeInTheDocument();
    expect(screen.getByText('The server did not respond in time.')).toBeInTheDocument();
  });

  it('does not render a retry button when onRetry is omitted', () => {
    renderWithTheme(<ErrorState data-testid='error-state' />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a retry button that calls onRetry when provided', () => {
    const handleRetry = vi.fn();

    renderWithTheme(<ErrorState onRetry={handleRetry} data-testid='error-state' />);

    const button = screen.getByRole('button', { name: 'Try again' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders a custom icon', () => {
    const CustomIcon = () => <div data-testid='custom-icon'>icon</div>;

    renderWithTheme(<ErrorState icon={<CustomIcon />} data-testid='error-state' />);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('exposes an alert role for assistive technology', () => {
    renderWithTheme(<ErrorState data-testid='error-state' />);

    expect(screen.getByTestId('error-state')).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('applies a custom className', () => {
    renderWithTheme(<ErrorState className='custom-error' data-testid='error-state' />);

    expect(screen.getByTestId('error-state')).toHaveClass('custom-error');
  });

  it('applies different sizes without error', () => {
    const { rerender } = renderWithTheme(<ErrorState size='sm' data-testid='error-state' />);
    expect(screen.getByTestId('error-state')).toBeInTheDocument();

    rerender(<ErrorState size='md' data-testid='error-state' />);
    expect(screen.getByTestId('error-state')).toBeInTheDocument();

    rerender(<ErrorState size='lg' data-testid='error-state' />);
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });
});
