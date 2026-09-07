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

  // Strip URL-significant control characters (tab, LF, CR, and other C0
  // controls) before scheme detection. Browsers strip these from an href
  // before resolving its scheme, so `java\tscript:` still executes as
  // javascript: even though the scheme regex below wouldn't match it —
  // without this, that string would fall through to the "no scheme →
  // relative, safe" branch and be returned unchanged (ADS-1292).
  const cleaned = url.replace(/[\x00-\x1f]/g, '').trim();
  if (cleaned.length === 0) {
    return FALLBACK;
  }

  // Reject protocol-relative URLs (//evil.com/path) — they inherit the
  // current page's scheme but can point to any host.
  if (cleaned.startsWith('//')) {
    return FALLBACK;
  }

  // Same-origin relative paths are safe.
  if (cleaned.startsWith('/')) {
    return cleaned;
  }

  // If there's no scheme separator, treat as relative — still safe.
  const schemeMatch = cleaned.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) {
    return cleaned;
  }

  const scheme = schemeMatch[1].toLowerCase() + ':';
  if (ALLOWED_SCHEMES.includes(scheme as (typeof ALLOWED_SCHEMES)[number])) {
    return cleaned;
  }

  return FALLBACK;
};
