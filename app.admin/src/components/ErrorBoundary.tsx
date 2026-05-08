import { Component, ErrorInfo, ReactNode } from 'react';
import { captureException } from '@adopt-dont-shop/lib.observability';
import * as styles from './ErrorBoundary.css';

type Props = {
  children: ReactNode;
  /** Optional custom fallback for per-route boundaries (ADS-482). */
  fallback?: ReactNode;
  /** Tag forwarded to Sentry so route-level boundaries can be distinguished. */
  boundary?: string;
};

type State = {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // ADS-406 / ADS-426: forward to Sentry. captureException no-ops when DSN absent.
    captureException(error, {
      app: 'admin',
      boundary: this.props.boundary ?? 'root',
      componentStack: errorInfo.componentStack,
    });
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorCard}>
            <div className={styles.iconContainer}>
              <svg
                className={styles.errorIcon}
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 14.5c-.77.833.192 2.5 1.732 2.5z'
                />
              </svg>
            </div>

            <h1 className={styles.errorTitle}>Oops! Something went wrong</h1>

            <p className={styles.errorMessage}>
              We're sorry, but something unexpected happened. Don't worry, your data is safe.
            </p>

            <div className={styles.buttonContainer}>
              <button className={styles.primaryButton} onClick={this.handleReset}>
                Try Again
              </button>

              <button className={styles.secondaryButton} onClick={this.handleReload}>
                Reload Page
              </button>
            </div>

            {/* ADS-423: import.meta.env.DEV is statically replaced by Vite. */}
            {import.meta.env.DEV && this.state.error && (
              <details className={styles.errorDetails}>
                <summary className={styles.errorSummary}>Show Error Details</summary>
                <div className={styles.errorContent}>
                  <div className={styles.errorDetailRow}>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className={styles.errorStack}>{this.state.error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
