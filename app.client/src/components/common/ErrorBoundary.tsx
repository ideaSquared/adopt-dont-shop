import { Component, ErrorInfo, ReactNode } from 'react';
import * as styles from './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  // ADS-482: optional name passed by per-route boundaries so Sentry breadcrumb
  // context can attribute a crash to the route that crashed (chat / discovery
  // / application form / etc.).
  boundary?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component for catching and handling React errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.errorContainer} role='alert'>
          <h2 className={styles.errorTitle}>Something went wrong</h2>
          <p className={styles.errorMessage}>
            We&apos;re sorry, but something unexpected happened. Please try again or contact support
            if the problem persists.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <details className={styles.errorDetails}>
              <summary className={styles.errorSummary}>Error Details (Development Only)</summary>
              <pre className={styles.errorPre}>{this.state.error.toString()}</pre>
            </details>
          )}
          <button className={styles.retryButton} onClick={this.handleRetry}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
