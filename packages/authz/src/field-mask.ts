import type { FieldAccessMap } from './field-access.js';

/**
 * Read-side response masking (ADS-1037).
 *
 * Strips every key of `payload` whose resolved access level is not
 * 'read' or 'write' — including keys entirely absent from `accessMap` —
 * so a field left out of the access map is hidden by default rather
 * than leaked through.
 *
 * Pure function: the caller decides what the "payload" universe is
 * (typically the object a handler is about to return) and resolves
 * `accessMap` via `resolveFieldAccessMap` first. Call this at the
 * serialisation boundary of the OWNING service, not at the gateway —
 * a direct gRPC caller must not be able to bypass it.
 */
export function fieldMask<T extends object>(payload: T, accessMap: FieldAccessMap): Partial<T> {
  const masked: Partial<T> = {};
  for (const key of Object.keys(payload) as Array<keyof T & string>) {
    const level = accessMap[key];
    if (level === 'read' || level === 'write') {
      masked[key] = payload[key];
    }
  }
  return masked;
}
