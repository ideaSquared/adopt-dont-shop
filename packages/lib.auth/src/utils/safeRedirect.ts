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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const stringOrEmpty = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Reads the post-login destination out of router `location.state`. A route
 * guard sets `state={{ from: location }}` when it bounces an unauthenticated
 * visitor to /login; this returns that location's path, query and hash, or
 * `/` when there is none or its path fails {@link isSafeRedirectPath}.
 */
export const redirectTargetFromState = (state: unknown): string => {
  const from = isRecord(state) ? state.from : undefined;
  const pathname = isRecord(from) ? from.pathname : undefined;
  if (typeof pathname !== 'string' || !isSafeRedirectPath(pathname) || !isRecord(from)) {
    return '/';
  }
  return `${pathname}${stringOrEmpty(from.search)}${stringOrEmpty(from.hash)}`;
};
