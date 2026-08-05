import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders the message', () => {
    render(<ErrorState message='Failed to load pets' />);

    expect(screen.getByText('Failed to load pets')).toBeInTheDocument();
  });

  it('renders a default title when none is provided', () => {
    render(<ErrorState message='Failed to load pets' />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    render(<ErrorState title='Could not load applications' message='Please try again later' />);

    expect(screen.getByText('Could not load applications')).toBeInTheDocument();
  });

  it('is announced to assistive technology as an alert', () => {
    render(<ErrorState message='Failed to load pets' data-testid='error-state' />);

    const errorState = screen.getByTestId('error-state');
    expect(errorState).toHaveAttribute('role', 'alert');
    expect(errorState).toHaveAttribute('aria-live', 'assertive');
  });

  it('does not render a retry button when onRetry is omitted', () => {
    render(<ErrorState message='Failed to load pets' />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a retry button that calls onRetry when clicked', () => {
    const handleRetry = vi.fn();

    render(<ErrorState message='Failed to load pets' onRetry={handleRetry} />);

    const retryButton = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(retryButton);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders a custom retry label', () => {
    render(<ErrorState message='Failed to load pets' onRetry={vi.fn()} retryLabel='Retry now' />);

    expect(screen.getByRole('button', { name: 'Retry now' })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <ErrorState
        message='Failed to load pets'
        className='custom-error-state'
        data-testid='error-state'
      />
    );

    expect(screen.getByTestId('error-state')).toHaveClass('custom-error-state');
  });
});
