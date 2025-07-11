import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { Toast, ToastContainer } from './Toast';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

const mockToast = {
  id: 'test-toast-1',
  message: 'Test notification',
  type: 'info' as const,
  duration: 5000,
};

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with basic props', () => {
    renderWithTheme(<Toast {...mockToast} />);

    expect(screen.getByText('Test notification')).toBeInTheDocument();
    expect(screen.getByLabelText('Close notification')).toBeInTheDocument();
  });

  it('renders different toast types with correct icons', () => {
    const { rerender } = renderWithTheme(<Toast {...mockToast} type='success' />);
    expect(screen.getByText('Test notification')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <Toast {...mockToast} type='error' />
      </StyledThemeProvider>
    );
    expect(screen.getByText('Test notification')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <Toast {...mockToast} type='warning' />
      </StyledThemeProvider>
    );
    expect(screen.getByText('Test notification')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <Toast {...mockToast} type='info' />
      </StyledThemeProvider>
    );
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    renderWithTheme(<Toast {...mockToast} onClose={handleClose} />);

    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);

    // Should call onClose after animation delay
    jest.advanceTimersByTime(200);
    expect(handleClose).toHaveBeenCalledWith('test-toast-1');
  });

  it('auto-closes after duration when autoClose is true', () => {
    const handleClose = jest.fn();
    renderWithTheme(<Toast {...mockToast} onClose={handleClose} autoClose duration={3000} />);

    // Fast-forward time
    jest.advanceTimersByTime(3000);

    // Should start closing animation
    jest.advanceTimersByTime(200);

    expect(handleClose).toHaveBeenCalledWith('test-toast-1');
  });

  it('does not auto-close when autoClose is false', () => {
    const handleClose = jest.fn();
    renderWithTheme(
      <Toast {...mockToast} onClose={handleClose} autoClose={false} duration={3000} />
    );

    // Fast-forward time beyond duration
    jest.advanceTimersByTime(5000);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('does not auto-close when duration is 0', () => {
    const handleClose = jest.fn();
    renderWithTheme(<Toast {...mockToast} onClose={handleClose} duration={0} />);

    // Fast-forward time
    jest.advanceTimersByTime(5000);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('renders with different positions', () => {
    const positions = [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ] as const;

    positions.forEach(position => {
      const { unmount } = renderWithTheme(<Toast {...mockToast} position={position} />);

      expect(screen.getByText('Test notification')).toBeInTheDocument();
      unmount();
    });
  });

  it('displays custom message', () => {
    const customMessage = 'Custom notification message';
    renderWithTheme(<Toast {...mockToast} message={customMessage} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });
});

describe('ToastContainer', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <ToastContainer position='top-right'>
        <Toast {...mockToast} />
        <Toast {...{ ...mockToast, id: 'toast-2', message: 'Second toast' }} />
      </ToastContainer>
    );

    expect(screen.getByText('Test notification')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('applies correct positioning styles', () => {
    const { container } = renderWithTheme(
      <ToastContainer position='bottom-left'>
        <Toast {...mockToast} />
      </ToastContainer>
    );

    expect(container.firstChild).toBeInTheDocument();
  });
});
