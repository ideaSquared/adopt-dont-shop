/**
 * Parse and validate pagination limit from query parameters
 * Ensures the limit is an integer within the specified bounds
 *
 * @param limitString - The limit query parameter value
 * @param options - Configuration object
 * @param options.default - Default limit if not provided or invalid
 * @param options.max - Maximum allowed limit (hard cap)
 * @param options.min - Minimum allowed limit (default: 1)
 * @returns The validated limit value
 * @throws Error if the limit is invalid or outside bounds
 */
export function parsePaginationLimit(
  limitString: string | undefined,
  options: {
    default: number;
    max: number;
    min?: number;
  }
): number {
  const { default: defaultLimit, max, min = 1 } = options;

  if (!limitString) {
    return defaultLimit;
  }

  const parsed = parseInt(limitString, 10);

  // Check if parsing resulted in a valid number
  if (isNaN(parsed)) {
    return defaultLimit;
  }

  // Clamp the value between min and max
  if (parsed < min) {
    return min;
  }

  if (parsed > max) {
    return max;
  }

  return parsed;
}

/**
 * Parse and validate a page number from query parameters.
 * Always returns an integer >= 1.
 */
export function parsePage(pageString: string | undefined, defaultPage = 1): number {
  if (!pageString) {
    return defaultPage;
  }
  const parsed = parseInt(pageString, 10);
  if (isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}
