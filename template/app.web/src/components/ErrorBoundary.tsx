import { Component, ErrorInfo, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
          <h1>Something went wrong</h1>
          <pre style={{ background: '#fee', padding: '1rem', borderRadius: 4 }}>
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
