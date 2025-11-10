/**
 * Enhanced Error Handling Utilities
 * Provides consistent error handling across the application
 */

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

export class ErrorHandler {
  static mapError(error: unknown, context?: Record<string, unknown>): AppError {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        userMessage:
          'Unable to connect to our servers. Please check your internet connection and try again.',
        recoverable: true,
        retryable: true,
        severity: 'medium',
        context,
      };
    }

    // HTTP errors
    if (error instanceof Response) {
      const status = error.status;
      if (status >= 400 && status < 500) {
        return {
          code: `HTTP_${status}`,
          message: `HTTP ${status}: ${error.statusText}`,
          userMessage:
            status === 404
              ? 'The requested information was not found.'
              : 'There was an issue with your request. Please check your information and try again.',
          recoverable: true,
          retryable: status === 429, // Rate limiting
          severity: 'medium',
          context,
        };
      }

      if (status >= 500) {
        return {
          code: `HTTP_${status}`,
          message: `HTTP ${status}: ${error.statusText}`,
          userMessage: 'Our servers are experiencing issues. Please try again in a few moments.',
          recoverable: true,
          retryable: true,
          severity: 'high',
          context,
        };
      }
    }

    // Validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message,
        userMessage:
          'Please check your information and ensure all required fields are completed correctly.',
        recoverable: true,
        retryable: false,
        severity: 'low',
        context,
      };
    }

    // Application-specific errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('pet not found')) {
        return {
          code: 'PET_NOT_FOUND',
          message: error.message,
          userMessage:
            'This pet is no longer available. Please browse our other pets looking for homes.',
          recoverable: false,
          retryable: false,
          severity: 'medium',
          context,
        };
      }

      if (message.includes('already have an active application')) {
        return {
          code: 'DUPLICATE_APPLICATION',
          message: error.message,
          userMessage:
            'You already have an application for this pet. You can view it in your dashboard.',
          recoverable: false,
          retryable: false,
          severity: 'low',
          context,
        };
      }

      if (message.includes('application data is incomplete')) {
        return {
          code: 'INCOMPLETE_DATA',
          message: error.message,
          userMessage:
            'Some required information is missing. Please complete all steps before submitting.',
          recoverable: true,
          retryable: false,
          severity: 'medium',
          context,
        };
      }
    }

    // Generic fallback
    return {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : String(error),
      userMessage:
        'An unexpected error occurred. Please try again or contact support if the problem persists.',
      recoverable: true,
      retryable: true,
      severity: 'medium',
      context,
    };
  }

  static shouldRetry(error: AppError, attemptCount: number, maxRetries = 3): boolean {
    return error.retryable && attemptCount < maxRetries;
  }

  static getRetryDelay(attemptCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attemptCount), 10000);
  }
}

export interface ErrorState {
  error: AppError | null;
  isRetrying: boolean;
  retryCount: number;
}

export const createErrorState = (): ErrorState => ({
  error: null,
  isRetrying: false,
  retryCount: 0,
});
