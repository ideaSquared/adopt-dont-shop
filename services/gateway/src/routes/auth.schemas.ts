// Zod schemas for the auth account-lifecycle routes (ADS-879). The gateway
// is the public edge — these bound format/length before a request reaches
// the inter-service layer, instead of relying on the downstream auth
// service to reject malformed input.
//
// Bodies accept both camelCase and snake_case keys (matching the existing
// pickString/pickBool alias lists in auth.ts), so `normalizeRegisterBody`
// resolves aliases into the canonical shape before it's validated.

import { z } from 'zod';

export const RegisterBodySchema = z.object({
  email: z.string().trim().min(1, 'email is required').max(254).email('email must be valid'),
  password: z.string().min(8, 'password must be at least 8 characters').max(128),
  firstName: z.string().trim().max(100).default(''),
  lastName: z.string().trim().max(100).default(''),
  phoneNumber: z.string().trim().max(32).optional(),
  termsAccepted: z.boolean().default(false),
  privacyPolicyAccepted: z.boolean().default(false),
});

export type RegisterBody = z.infer<typeof RegisterBodySchema>;

const pickRaw = (body: Record<string, unknown>, keys: readonly string[]): unknown => {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) {
      return body[key];
    }
  }
  return undefined;
};

export const normalizeRegisterBody = (body: Record<string, unknown>): Record<string, unknown> => ({
  email: body.email,
  password: body.password,
  firstName: pickRaw(body, ['firstName', 'first_name']),
  lastName: pickRaw(body, ['lastName', 'last_name']),
  phoneNumber: pickRaw(body, ['phoneNumber', 'phone_number']),
  termsAccepted: pickRaw(body, ['termsAccepted', 'terms_accepted', 'acceptedTerms']),
  privacyPolicyAccepted: pickRaw(body, ['privacyPolicyAccepted', 'privacy_policy_accepted']),
});

export type ValidationFailure = {
  error: string;
  details: { path: string; message: string }[];
};

export const toValidationFailure = (error: z.ZodError): ValidationFailure => ({
  error: 'Invalid request body',
  details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
});
