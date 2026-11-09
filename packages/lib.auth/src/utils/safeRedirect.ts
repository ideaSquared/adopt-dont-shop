/**
 * Guards against open-redirect attacks by ensuring a redirect target is a
 * same-origin path.
 *
 * Rejects:
 *   - Absolute URLs starting with `http://`, `https://`, etc.
 *   - Protocol-relative URLs (`//evil.com`)
 *   - Backslash variants (`/\evil`)
 *   - `javascript:` pseudo-URLs
 *
 * Only accepts paths that start with a single `/`.
 */
export const isSafeRedirectPath = (value: string | null | undefined): value is string => {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//') || value.startsWith('/\\')) return false;
  return true;
};
