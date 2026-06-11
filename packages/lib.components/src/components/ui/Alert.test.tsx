import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Alert } from './Alert';

const renderWithTheme = (component: React.ReactElement) => render(component);

describe('Alert', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Alert>Test alert message</Alert>);
    const alert = screen.getByText('Test alert message');
    expect(alert).toBeInTheDocument();
  });

  it('applies variant styles correctly', () => {
    renderWithTheme(<Alert variant='success'>Success message</Alert>);
    const alert = screen.getByText('Success message');
    expect(alert).toBeInTheDocument();
  });

  it('shows close button when closable', () => {
    const handleClose = vi.fn();
    renderWithTheme(
      <Alert closable onClose={handleClose}>
        Closable alert
      </Alert>
    );
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    renderWithTheme(
      <Alert closable onClose={handleClose}>
        Closable alert
      </Alert>
    );

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Alert data-testid='test-alert'>Test alert</Alert>);
    const alert = screen.getByTestId('test-alert');
    expect(alert).toBeInTheDocument();
  });

  it('renders with different variant styles', () => {
    const variants: Array<'info' | 'success' | 'warning' | 'error'> = [
      'info',
      'success',
      'warning',
      'error',
    ];

    variants.forEach(variant => {
      renderWithTheme(<Alert variant={variant}>{variant} alert</Alert>);
      const alert = screen.getByText(`${variant} alert`);
      expect(alert).toBeInTheDocument();
    });
  });

  // C2-7: explicit aria-live keeps screen readers reliably announcing
  // async errors/warnings when they appear; success/info stay polite
  // so they don't interrupt the user mid-task.
  it('announces error and warning variants assertively', () => {
    const { rerender } = renderWithTheme(<Alert variant='error'>Async error</Alert>);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');

    rerender(<Alert variant='warning'>Watch out</Alert>);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('announces success and info variants politely', () => {
    const { rerender } = renderWithTheme(<Alert variant='success'>Saved</Alert>);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');

    rerender(<Alert variant='info'>Heads up</Alert>);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
  });
});
