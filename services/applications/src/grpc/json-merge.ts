// Pure recursive JSON merge backing UpdateApplicationDefaults — no I/O,
// fully unit-testable.
//
// Plain objects merge key-by-key, recursing into shared keys that are
// themselves plain objects on both sides. Anything else (arrays,
// scalars, null, or a type mismatch between base and patch) takes the
// patch's value wholesale — this matches the SPA's expectation that
// sending a new `references.personal` array replaces the old one
// rather than splicing it.

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

function isPlainObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeJson(base: JsonValue, patch: JsonValue): JsonValue {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch;
  }
  const result: JsonObject = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = key in base ? mergeJson(base[key], value) : value;
  }
  return result;
}
