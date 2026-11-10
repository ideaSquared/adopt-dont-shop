// Shared by the notifications event contracts: checks that a received message
// body carries the string fields a subscriber reads, then hands it on with the
// subscriber's own event type.

export function eventBody<T>(subject: string, body: unknown, required: readonly string[]): T {
  if (typeof body !== 'object' || body === null) {
    throw new Error(`${subject}: body must be an object, got: ${JSON.stringify(body)}`);
  }
  // Narrowed to a non-null object above; each required field is checked below.
  const fields = body as Record<string, unknown>;
  const missing = required.filter(key => typeof fields[key] !== 'string' || fields[key] === '');
  if (missing.length > 0) {
    throw new Error(`${subject}: missing or empty string field(s): ${missing.join(', ')}`);
  }
  // The required fields are checked above; the subscriber's type is the
  // contract under test, so the body is handed on as that type.
  return body as T;
}
