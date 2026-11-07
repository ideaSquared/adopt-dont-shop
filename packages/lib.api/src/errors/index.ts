// HTTP Error Classes for lib.api
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ConflictError extends Error {
  constructor(
    message: string,
    public conflicts?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

/**
 * Parse a Retry-After header in delta-seconds form. HTTP-date values and
 * anything that is not a positive whole number are ignored.
 */
export function parseRetryAfterSeconds(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value.trim())) {
    return undefined;
  }
  const seconds = Number(value.trim());
  return seconds > 0 ? seconds : undefined;
}

/**
 * Factory function to create appropriate error based on HTTP status
 */
export function createHttpError(
  status: number,
  message: string,
  code?: string,
  details?: unknown,
  retryAfterSeconds?: number
): Error {
  switch (status) {
    case 400:
      return new ValidationError(message, details as Record<string, string[]>);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message, details as Record<string, unknown>);
    case 422:
      return new ValidationError(message, details as Record<string, string[]>);
    default:
      return new ApiError(message, status, code, details, retryAfterSeconds);
  }
}
