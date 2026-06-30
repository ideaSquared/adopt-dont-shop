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

const tokenField = z.string().trim().min(1).max(512);
const emailField = z
  .string()
  .trim()
  .min(1, 'email is required')
  .max(254)
  .email('email must be valid');
const newPasswordField = z.string().min(8, 'password must be at least 8 characters').max(128);

export const VerifyEmailBodySchema = z.object({
  verificationToken: tokenField,
});

export type VerifyEmailBody = z.infer<typeof VerifyEmailBodySchema>;

export const normalizeVerifyEmailBody = (
  body: Record<string, unknown>
): Record<string, unknown> => ({
  verificationToken: pickRaw(body, ['verificationToken', 'verification_token']),
});

export const ForgotPasswordBodySchema = z.object({
  email: emailField,
});

export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBodySchema>;

export const ResendVerificationBodySchema = z.object({
  email: emailField,
});

export type ResendVerificationBody = z.infer<typeof ResendVerificationBodySchema>;

export const ResetPasswordBodySchema = z.object({
  resetToken: tokenField,
  newPassword: newPasswordField,
});

export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>;

export const normalizeResetPasswordBody = (
  body: Record<string, unknown>
): Record<string, unknown> => ({
  resetToken: pickRaw(body, ['resetToken', 'reset_token']),
  newPassword: pickRaw(body, ['newPassword', 'new_password']),
});

export const RedeemInvitationBodySchema = z.object({
  invitationToken: tokenField,
  newPassword: newPasswordField,
});

export type RedeemInvitationBody = z.infer<typeof RedeemInvitationBodySchema>;

export const normalizeRedeemInvitationBody = (
  body: Record<string, unknown>
): Record<string, unknown> => ({
  invitationToken: pickRaw(body, ['invitationToken', 'invitation_token']),
  newPassword: pickRaw(body, ['newPassword', 'new_password']),
});

export const ChangePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required').max(128),
  newPassword: newPasswordField,
});

export type ChangePasswordBody = z.infer<typeof ChangePasswordBodySchema>;

export const normalizeChangePasswordBody = (
  body: Record<string, unknown>
): Record<string, unknown> => ({
  currentPassword: pickRaw(body, ['currentPassword', 'current_password']),
  newPassword: pickRaw(body, ['newPassword', 'new_password']),
});

export const UpdateAccountBodySchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  phoneNumber: z.string().trim().max(32).optional(),
  bio: z.string().trim().max(1000).optional(),
  timezone: z.string().trim().max(64).optional(),
  language: z.string().trim().max(10).optional(),
  country: z.string().trim().max(64).optional(),
  city: z.string().trim().max(64).optional(),
  addressLine1: z.string().trim().max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().max(16).optional(),
});

export type UpdateAccountBody = z.infer<typeof UpdateAccountBodySchema>;

export const normalizeUpdateAccountBody = (
  body: Record<string, unknown>
): Record<string, unknown> => ({
  firstName: pickRaw(body, ['firstName', 'first_name']),
  lastName: pickRaw(body, ['lastName', 'last_name']),
  phoneNumber: pickRaw(body, ['phoneNumber', 'phone_number']),
  bio: body.bio,
  timezone: body.timezone,
  language: body.language,
  country: body.country,
  city: body.city,
  addressLine1: pickRaw(body, ['addressLine1', 'address_line_1']),
  addressLine2: pickRaw(body, ['addressLine2', 'address_line_2']),
  postalCode: pickRaw(body, ['postalCode', 'postal_code']),
});

export type ValidationFailure = {
  error: string;
  details: { path: string; message: string }[];
};

export const toValidationFailure = (error: z.ZodError): ValidationFailure => ({
  error: 'Invalid request body',
  details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
});
