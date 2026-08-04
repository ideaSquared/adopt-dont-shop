import type { FieldAccessMap } from './field-access.js';

export type FieldWriteGuardResult = { allowed: true } | { allowed: false; blockedFields: string[] };

/**
 * Write-side request guard (ADS-1037).
 *
 * Every key present in `body` — i.e. every field the caller is actually
 * trying to set — must resolve to 'write' access; 'read', 'none', or a
 * field absent from `accessMap` all block the request. The whole write
 * is rejected (not partially applied) so a caller can't be misled into
 * thinking a dropped field was saved.
 *
 * Pure function: the caller passes only the fields it was about to
 * write (e.g. the subset of an update request that is `!== undefined`),
 * resolves `accessMap` via `resolveFieldAccessMap` first, and on
 * `allowed: false` returns PERMISSION_DENIED with `blockedFields`
 * before the write reaches the database. Call this at the OWNING
 * service's handler, not the gateway.
 */
export function fieldWriteGuard<T extends Record<string, unknown>>(
  body: T,
  accessMap: FieldAccessMap
): FieldWriteGuardResult {
  const blockedFields = Object.keys(body).filter(key => accessMap[key] !== 'write');
  if (blockedFields.length > 0) {
    return { allowed: false, blockedFields };
  }
  return { allowed: true };
}
