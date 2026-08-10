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
 * Remove sensitive params from a URL fragment. Two shapes occur in the wild and
 * neither is visible to `url.searchParams`, so a fragment-carried token would
 * otherwise slip past the query-string strip (ADS-1118):
 *
 *   - OAuth-implicit / bare params:  #access_token=…&state=…
 *   - hash-routed app paths:         #/verify-email?token=…&ref=…
 *
 * Returns the value to assign back to `url.hash` ('' clears the fragment) and
 * whether anything was removed. A plain anchor (`#section-2`) or a fragment with
 * no sensitive params is reported unchanged so nothing is normalised needlessly.
 */
const stripSensitiveHash = (hash: string): { value: string; stripped: boolean } => {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw === '') {
    return { value: hash, stripped: false };
  }

  // A hash-routed path carries its own query after the first '?'. Without one,
  // treat the whole fragment as bare params (a plain anchor simply matches none).
  const queryStart = raw.indexOf('?');
  const routePrefix = queryStart === -1 ? '' : raw.slice(0, queryStart);
  const params = new URLSearchParams(queryStart === -1 ? raw : raw.slice(queryStart + 1));

  let stripped = false;
  for (const param of SENSITIVE_QUERY_PARAMS) {
    if (params.has(param)) {
      params.delete(param);
      stripped = true;
    }
  }
  if (!stripped) {
    return { value: hash, stripped: false };
  }

  const rest = params.toString();
  if (routePrefix === '') {
    return { value: rest === '' ? '' : `#${rest}`, stripped: true };
  }
  return { value: rest === '' ? `#${routePrefix}` : `#${routePrefix}?${rest}`, stripped: true };
};

/**
 * Return `rawUrl` with every {@link SENSITIVE_QUERY_PARAMS} entry removed from
 * BOTH its query string and its fragment. Handles absolute URLs
 * (window.location.href) and relative paths (e.g. '/verify-email?token=…') —
 * the latter are common because trackPageView accepts arbitrary strings and app
 * code passes route paths. Non-sensitive params (pagination, UTM, etc.) are
 * preserved in place, and a relative input is returned in relative form. A URL
 * carrying none of the sensitive params, or a string that parses as neither, is
 * returned unchanged so nothing is normalised needlessly.
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

  const hashResult = stripSensitiveHash(url.hash);
  if (hashResult.stripped) {
    url.hash = hashResult.value;
    stripped = true;
  }

  if (!stripped) {
    return rawUrl;
  }
  return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
};
