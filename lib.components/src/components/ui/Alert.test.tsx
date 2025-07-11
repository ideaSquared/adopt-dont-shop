import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../styles/theme';
import { Alert } from './Alert';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

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
    const handleClose = jest.fn();
    renderWithTheme(
      <Alert closable onClose={handleClose}>
        Closable alert
      </Alert>
    );
    const closeButton = screen.getByRole('button');
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
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
});
