// Zod schema for the rescue route's `website` field (ADS-1292).
// Follows the same pattern as the imageUrl/virtualLink schemas in
// events.schemas.ts: safeHref sanitises rendering (packages/lib.utils/src/
// safe-href.ts), but the gateway also validates at the write boundary so a
// non-http(s) scheme is rejected before it's ever stored.

import { z } from 'zod';

export type ValidationFailure = {
  error: string;
  details: { path: string; message: string }[];
};

export const toValidationFailure = (error: z.ZodError): ValidationFailure => ({
  error: 'Invalid request body',
  details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
});

// website is rendered through safeHref in an <a href … target="_blank"> on
// the public rescue page and the admin contact modal. It must be a
// well-formed https:// URL, which rejects javascript:, data:, and
// protocol-relative //host schemes (including control-character-obfuscated
// variants — the WHATWG URL parser strips tab/newline/CR before resolving
// the scheme, same as a browser resolving an href).
const isSafeWebsiteUrl = (value: string): boolean => {
  if (value === '') {
    return true;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:';
};

export const websiteSchema = z
  .string()
  .max(2048)
  .refine(isSafeWebsiteUrl, { message: 'must be an https:// URL' });
