import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

const Boom = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Boom');
  }
  return <div>child rendered</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs caught render errors; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('child rendered')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces the default fallback as an alert with both recovery actions', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  });

  it('renders a custom fallback instead of the default one', () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('custom fallback')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports the error and component stack through onError', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const [error, errorInfo] = onError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Boom');
    expect(typeof errorInfo.componentStack).toBe('string');
  });

  it('shows the children again after Try again when the cause is gone', () => {
    let shouldThrow = true;
    const Flaky = () => <Boom shouldThrow={shouldThrow} />;

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('child rendered')).toBeInTheDocument();
  });

  it('reloads the page from Reload page', () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload });

    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows error details in development', () => {
    vi.stubEnv('DEV', true);

    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error details/i)).toBeInTheDocument();
  });

  it('hides error details outside development', () => {
    vi.stubEnv('DEV', false);

    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/error details/i)).not.toBeInTheDocument();
  });
});
