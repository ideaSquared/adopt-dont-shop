/**
 * XSS-hardened href/src sanitizer for user-controlled URL strings.
 *
 * Returns the input unchanged if it uses an allowlisted scheme
 * (http, https, mailto, tel) or is a same-origin relative path
 * (starts with '/' but not '//'). Otherwise returns '#'.
 *
 * This blocks javascript:, data:, vbscript:, file: and protocol-relative
 * (//evil.com) URLs that would otherwise execute script or navigate
 * cross-origin when bound to an <a href> / <img src> attribute.
 */
const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'] as const;
const FALLBACK = '#';

export const safeHref = (url: string | null | undefined): string => {
  if (url === null || url === undefined) {
    return FALLBACK;
  }

  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return FALLBACK;
  }

  // Reject protocol-relative URLs (//evil.com/path) — they inherit the
  // current page's scheme but can point to any host.
  if (trimmed.startsWith('//')) {
    return FALLBACK;
  }

  // Same-origin relative paths are safe.
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // If there's no scheme separator, treat as relative — still safe.
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) {
    return trimmed;
  }

  const scheme = schemeMatch[1].toLowerCase() + ':';
  if (ALLOWED_SCHEMES.includes(scheme as (typeof ALLOWED_SCHEMES)[number])) {
    return trimmed;
  }

  return FALLBACK;
};
