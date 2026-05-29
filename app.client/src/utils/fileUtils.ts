/**
 * Utility functions for handling file URLs and paths
 */

/**
 * Resolves a relative file URL against the backend base URL
 * @param url - The URL to resolve (can be relative or absolute)
 * @returns The resolved absolute URL or undefined if input is invalid
 */
export const resolveFileUrl = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }

  // If it's a placeholder URL, return undefined to use fallback
  if (url.includes('via.placeholder.com') || url.includes('placeholder')) {
    return undefined;
  }

  // Reject any URL whose scheme isn't http/https. This blocks
  // javascript:, data:, vbscript:, file: etc. from reaching an
  // <img src> or similar attribute. Scheme detection is
  // case-insensitive and tolerates leading whitespace.
  const trimmed = url.trim();
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      return undefined;
    }
    return trimmed;
  }

  // Reject protocol-relative URLs (//evil.com/path) — they would
  // resolve to a cross-origin host under the page's scheme.
  if (trimmed.startsWith('//')) {
    return undefined;
  }

  // Get the backend base URL from environment variables. Fall back to an empty
  // string (same-origin / relative URLs) rather than a hardcoded host so that
  // production builds without VITE_API_BASE_URL still resolve images correctly.
  const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

  // If it's a relative path starting with '/', prepend the base URL
  if (url.startsWith('/')) {
    return `${backendBaseUrl}${url}`;
  }

  // For other relative paths, also prepend the base URL with a '/'
  return `${backendBaseUrl}/${url}`;
};

/**
 * Validates if a URL is accessible (basic format check)
 * @param url - The URL to validate
 * @returns True if the URL appears to be valid
 */
export const isValidFileUrl = (url: string | undefined): boolean => {
  if (!url) {
    return false;
  }

  // Check if it's a valid HTTP/HTTPS URL or a relative path
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/') ||
    (!url.includes('://') && url.length > 0)
  );
};
