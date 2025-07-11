import { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  min-height: 200px;
  background: ${props => props.theme.colors.semantic.error[50]};
  border: 1px solid ${props => props.theme.colors.semantic.error[200]};
  border-radius: ${props => props.theme.border.radius.lg};
  margin: 1rem;
`;

const ErrorTitle = styled.h2`
  color: ${props => props.theme.colors.semantic.error[700]};
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  color: ${props => props.theme.colors.semantic.error[600]};
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  max-width: 500px;
`;

const RetryButton = styled.button`
  background: ${props => props.theme.colors.primary[500]};
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: ${props => props.theme.border.radius.md};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary[600]};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary[300]};
    outline-offset: 2px;
  }
`;

/**
 * Error Boundary component for catching and handling React errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // You could also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render default error UI
      return (
        <ErrorContainer role='alert'>
          <ErrorTitle>Something went wrong</ErrorTitle>
          <ErrorMessage>
            We&apos;re sorry, but something unexpected happened. Please try again or contact support
            if the problem persists.
          </ErrorMessage>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{ fontSize: '0.875rem', overflow: 'auto', maxWidth: '100%' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
          <RetryButton onClick={this.handleRetry}>Try Again</RetryButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}
