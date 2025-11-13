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

  // If it's already an absolute URL, use it as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Get the backend base URL from environment variables
  const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://api.localhost';

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
