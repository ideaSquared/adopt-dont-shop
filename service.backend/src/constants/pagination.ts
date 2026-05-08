/**
 * Shared pagination constants for controllers.
 *
 * Centralises the default and maximum page sizes that were previously
 * duplicated across controllers as inline literals (ADS-524).
 */

/**
 * Default page size returned when the client does not supply `limit`.
 * Matches the pre-existing default used by most listing endpoints.
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Hard upper bound on `limit` that any authenticated request may ask for.
 * Acts as a guardrail against expensive `LIMIT` values being passed in.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Larger default page size for endpoints that surface lighter rows
 * (e.g. messages, search results) where 20 is too restrictive.
 */
export const LARGE_PAGE_SIZE = 50;
