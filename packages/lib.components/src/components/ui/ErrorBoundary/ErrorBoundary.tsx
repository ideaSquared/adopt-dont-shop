import { Component, ErrorInfo, ReactNode } from 'react';

import * as styles from './ErrorBoundary.css';

export type ErrorBoundaryProps = {
  children: ReactNode;
  /** Replaces the default fallback UI, e.g. for per-route boundaries. */
  fallback?: ReactNode;
  /** Called once per caught error; apps use it to report to their error tracker. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

const ErrorIcon = () => (
  <svg
    className={styles.icon}
    fill='none'
    viewBox='0 0 24 24'
    stroke='currentColor'
    aria-hidden='true'
    focusable='false'
  >
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 14.5c-.77.833.192 2.5 1.732 2.5z'
    />
  </svg>
);

/**
 * Catches render errors in its subtree and shows a recoverable fallback. It has no
 * error-tracking dependency: pass `onError` to report. The fallback styles carry
 * literal colour fallbacks, so it stays legible when mounted outside ThemeProvider.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static displayName = 'ErrorBoundary';

  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className={styles.container}>
        <div className={styles.card} role='alert'>
          <ErrorIcon />
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.message}>
            Something unexpected happened. Try again or reload the page.
          </p>
          <div className={styles.actions}>
            <button type='button' className={styles.primaryButton} onClick={this.handleReset}>
              Try again
            </button>
            <button type='button' className={styles.secondaryButton} onClick={this.handleReload}>
              Reload page
            </button>
          </div>
          {import.meta.env.DEV && (
            <details className={styles.details}>
              <summary className={styles.summary}>Error details (development only)</summary>
              <p>{error.message}</p>
              {error.stack && <pre className={styles.stack}>{error.stack}</pre>}
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
