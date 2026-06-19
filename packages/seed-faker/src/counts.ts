/**
 * Resolve a spam volume from `SPAM_<ENTITY>`, falling back to a default.
 *
 * An explicit 0 is honoured (skip this entity). Non-numeric or negative
 * values fall back to the default rather than erroring — a typo should not
 * silently produce a negative loop bound.
 */

export const spamCount = (entity: string, fallback: number): number => {
  const raw = process.env[`SPAM_${entity}`];
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};
