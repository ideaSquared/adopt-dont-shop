/**
 * Maps an unknown error to a user-friendly message based on HTTP status
 * or network failure. Avoids leaking internal details to the UI.
 */
export const getErrorMessage = (error: unknown): string => {
  if (error !== null && error !== undefined && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status === 401) return 'Session expired. Please log in again.';
    if (status === 429) return 'Too many requests. Please wait a moment.';
    if (status >= 500) return 'Something went wrong on our end. Please try again later.';
  }

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Unable to connect. Check your internet connection.';
  }

  if (
    error instanceof Error &&
    'code' in error &&
    (error as { code: string }).code === 'ERR_NETWORK'
  ) {
    return 'Unable to connect. Check your internet connection.';
  }

  return 'Something went wrong. Please try again.';
};
