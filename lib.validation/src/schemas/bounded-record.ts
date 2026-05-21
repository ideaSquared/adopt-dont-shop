import { z } from 'zod';

/**
 * Bounded record schema for JSONB-backed free-form payloads.
 *
 * Three defensive caps to prevent DoS via unbounded JSON:
 *  - max number of top-level keys
 *  - max length per string value (recursively, for nested strings)
 *  - max total stringified size of the payload
 *
 * Used by Application.answers, Pet.data, Rescue.settings — each with its
 * own limits, since the field semantics differ.
 */
export type BoundedRecordOptions = {
  maxKeys: number;
  maxStringLength: number;
  maxPayloadBytes: number;
};

const hasOversizedString = (value: unknown, maxLen: number): boolean => {
  if (typeof value === 'string') {
    return value.length > maxLen;
  }
  if (Array.isArray(value)) {
    return value.some((v) => hasOversizedString(v, maxLen));
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) =>
      hasOversizedString(v, maxLen)
    );
  }
  return false;
};

export const boundedRecord = ({
  maxKeys,
  maxStringLength,
  maxPayloadBytes,
}: BoundedRecordOptions) =>
  z
    .record(z.string().max(200), z.unknown())
    .refine((obj) => Object.keys(obj).length <= maxKeys, {
      message: `Too many keys (max ${maxKeys})`,
    })
    .refine((obj) => !hasOversizedString(obj, maxStringLength), {
      message: `String value exceeds max length of ${maxStringLength}`,
    })
    .refine((obj) => JSON.stringify(obj).length <= maxPayloadBytes, {
      message: `Payload too large (max ${maxPayloadBytes} bytes)`,
    });
