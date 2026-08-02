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

/**
 * Return `rawUrl` with every {@link SENSITIVE_QUERY_PARAMS} entry removed from
 * its query string. Non-sensitive params (pagination, UTM, etc.) are preserved
 * in place. Input that isn't a parseable absolute URL is returned unchanged, as
 * is a URL that carried none of the sensitive params (so nothing is normalised
 * needlessly).
 */
export const stripSensitiveParams = (rawUrl: string): string => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  let stripped = false;
  for (const param of SENSITIVE_QUERY_PARAMS) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      stripped = true;
    }
  }

  return stripped ? url.toString() : rawUrl;
};
