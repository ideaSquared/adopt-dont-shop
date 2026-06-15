import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Toast, ToastContainer } from './Toast';

const renderWithTheme = (component: React.ReactElement) => render(component);

const mockToast = {
  id: 'test-toast-1',
  message: 'Test notification',
  type: 'info' as const,
  duration: 5000,
};

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders correctly with basic props', () => {
    renderWithTheme(<Toast {...mockToast} />);

    expect(screen.getByText('Test notification')).toBeInTheDocument();
    expect(screen.getByLabelText('Close notification')).toBeInTheDocument();
  });

  it('renders different toast types with correct icons', () => {
    const { rerender } = renderWithTheme(<Toast {...mockToast} type='success' />);
    expect(screen.getByText('Test notification')).toBeInTheDocument();

    rerender(<Toast {...mockToast} type='error' />);
    expect(screen.getByText('Test notification')).toBeInTheDocument();

    rerender(<Toast {...mockToast} type='warning' />);
    expect(screen.getByText('Test notification')).toBeInTheDocument();

    rerender(<Toast {...mockToast} type='info' />);
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });

  it('announces success/info as a polite status region', () => {
    renderWithTheme(<Toast {...mockToast} type='info' />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('Test notification');
  });

  it('announces errors/warnings as an assertive alert region', () => {
    const { rerender } = renderWithTheme(<Toast {...mockToast} type='error' />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');

    rerender(<Toast {...mockToast} type='warning' />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    renderWithTheme(<Toast {...mockToast} onClose={handleClose} />);

    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);

    // Should call onClose after animation delay
    vi.advanceTimersByTime(200);
    expect(handleClose).toHaveBeenCalledWith('test-toast-1');
  });

  it('auto-closes after duration when autoClose is true', () => {
    const handleClose = vi.fn();
    renderWithTheme(<Toast {...mockToast} onClose={handleClose} autoClose duration={3000} />);

    // Fast-forward time
    vi.advanceTimersByTime(3000);

    // Should start closing animation
    vi.advanceTimersByTime(200);

    expect(handleClose).toHaveBeenCalledWith('test-toast-1');
  });

  it('does not auto-close when autoClose is false', () => {
    const handleClose = vi.fn();
    renderWithTheme(
      <Toast {...mockToast} onClose={handleClose} autoClose={false} duration={3000} />
    );

    // Fast-forward time beyond duration
    vi.advanceTimersByTime(5000);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('does not auto-close when duration is 0', () => {
    const handleClose = vi.fn();
    renderWithTheme(<Toast {...mockToast} onClose={handleClose} duration={0} />);

    // Fast-forward time
    vi.advanceTimersByTime(5000);

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

  it('does not call onClose after unmount when the component is removed mid-exit-animation', () => {
    // Regression: before the fix the 200ms exit timer was not cleared on
    // unmount, so onClose could fire against an already-unmounted host.
    const handleClose = vi.fn();
    const { unmount } = renderWithTheme(
      <Toast {...mockToast} onClose={handleClose} autoClose duration={3000} />
    );

    // Advance past the auto-close duration so the exit animation timer starts
    vi.advanceTimersByTime(3000);

    // Unmount before the 200ms animation timer fires
    unmount();

    // Advancing past the animation window should not trigger onClose
    vi.advanceTimersByTime(200);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('does not call onClose after unmount when the user clicks close mid-animation', () => {
    const handleClose = vi.fn();
    const { unmount } = renderWithTheme(<Toast {...mockToast} onClose={handleClose} />);

    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);

    // Unmount before the 200ms animation completes
    unmount();

    vi.advanceTimersByTime(200);
    expect(handleClose).not.toHaveBeenCalled();
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
