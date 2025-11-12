import { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  min-height: 100vh;
  background-color: #f9fafb;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
`;

const ErrorCard = styled.div`
  max-width: 28rem;
  width: 100%;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  text-align: center;
`;

const IconContainer = styled.div`
  margin-bottom: 1rem;
`;

const ErrorIcon = styled.svg`
  margin: 0 auto;
  height: 3rem;
  width: 3rem;
  color: #ef4444;
`;

const ErrorTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
`;

const ErrorMessage = styled.p`
  color: #4b5563;
  margin-bottom: 1.5rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PrimaryButton = styled.button`
  width: 100%;
  background-color: #2563eb;
  color: white;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #1d4ed8;
  }
`;

const SecondaryButton = styled.button`
  width: 100%;
  background-color: #4b5563;
  color: white;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #374151;
  }
`;

const ErrorDetails = styled.details`
  margin-top: 1.5rem;
  text-align: left;
`;

const ErrorSummary = styled.summary`
  cursor: pointer;
  font-size: 0.875rem;
  color: #6b7280;
  transition: color 0.2s;

  &:hover {
    color: #374151;
  }
`;

const ErrorContent = styled.div`
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: #f3f4f6;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #1f2937;
  overflow: auto;
  max-height: 10rem;
`;

const ErrorStack = styled.pre`
  white-space: pre-wrap;
  margin-top: 0.25rem;
`;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console and potentially to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Here you could also send the error to an error reporting service
    // Example: errorReportingService.captureException(error, { extra: errorInfo });
  }

  handleReload = () => {
    // Reset the error boundary state
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    // Optionally reload the page
    window.location.reload();
  };

  handleReset = () => {
    // Just reset the error boundary state without reloading
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorCard>
            <IconContainer>
              <ErrorIcon fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 14.5c-.77.833.192 2.5 1.732 2.5z'
                />
              </ErrorIcon>
            </IconContainer>

            <ErrorTitle>Oops! Something went wrong</ErrorTitle>

            <ErrorMessage>
              We're sorry, but something unexpected happened. Don't worry, your data is safe.
            </ErrorMessage>

            <ButtonContainer>
              <PrimaryButton onClick={this.handleReset}>Try Again</PrimaryButton>

              <SecondaryButton onClick={this.handleReload}>Reload Page</SecondaryButton>
            </ButtonContainer>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <ErrorDetails>
                <ErrorSummary>Show Error Details</ErrorSummary>
                <ErrorContent>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <ErrorStack>{this.state.error.stack}</ErrorStack>
                    </div>
                  )}
                </ErrorContent>
              </ErrorDetails>
            )}
          </ErrorCard>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
