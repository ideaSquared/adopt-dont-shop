/**
 * Query parameters that carry single-use credentials or secrets and must never
 * be recorded by analytics (ADS-1012). Password-reset / email-verification /
 * rescue-invitation links put these in the URL; a verbatim page-view capture
 * would persist them to the analytics datastore where anyone with read access —
 * or a backup — could resurrect them for account takeover.
 *
 * Single source of truth: both the analytics capture path and any route-level
 * URL cleanup should reference this list rather than duplicating it.
 */
export const SENSITIVE_QUERY_PARAMS = [
  'token',
  'code',
  'key',
  'access_token',
  'id_token',
  'secret',
] as const;

// Base used only to parse RELATIVE inputs (e.g. '/verify-email?token=…', which
// trackPageView receives from AnalyticsContext callers). Never emitted — a
// relative input yields a relative result so the origin is preserved as the
// caller intended.
const RELATIVE_PARSE_BASE = 'http://relative.invalid';

/**
 * Return `rawUrl` with every {@link SENSITIVE_QUERY_PARAMS} entry removed from
 * its query string. Handles BOTH absolute URLs (window.location.href) and
 * relative paths (e.g. '/verify-email?token=…') — the latter are common because
 * trackPageView accepts arbitrary strings and app code passes route paths.
 * Non-sensitive params (pagination, UTM, etc.) are preserved in place, and a
 * relative input is returned in relative form. A URL carrying none of the
 * sensitive params, or a string that parses as neither, is returned unchanged
 * so nothing is normalised needlessly.
 */
export const stripSensitiveParams = (rawUrl: string): string => {
  let url: URL;
  let isAbsolute = true;
  try {
    url = new URL(rawUrl);
  } catch {
    try {
      url = new URL(rawUrl, RELATIVE_PARSE_BASE);
      isAbsolute = false;
    } catch {
      return rawUrl;
    }
  }

  let stripped = false;
  for (const param of SENSITIVE_QUERY_PARAMS) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      stripped = true;
    }
  }

  if (!stripped) {
    return rawUrl;
  }
  return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
};
