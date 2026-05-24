import { z } from 'zod';
import { USER_STATUSES, type UserId, type UserRole } from '@adopt-dont-shop/lib.types';
import { isSingleScriptLocalPart, normalizeEmail } from '../normalize-email';
import { BulkOperationFailedIdsSchema } from './bulk-response';

// ----- Enums (canonical values from lib.types) ---------------------------

export const UserStatusSchema = z.enum(USER_STATUSES);

const USER_TYPES = [
  'adopter',
  'rescue_staff',
  'admin',
  'moderator',
  'super_admin',
  'support_agent',
] as const satisfies readonly UserRole[];
export const UserTypeSchema = z.enum(USER_TYPES);

// ----- Primitives ---------------------------------------------------------

export const UserIdSchema = z
  .string()
  .min(1, 'User ID is required')
  .transform((v) => v as UserId);

/**
 * Canonical email rule. Applies NFKC + trim + lowercase via
 * normalizeEmail so visually-identical compatibility variants collapse
 * to a single canonical form before uniqueness checks. Rejects local
 * parts that mix more than one Unicode script — the Cyrillic-vs-Latin
 * homograph that NFKC alone does not fold. Length / format checks run
 * after normalization so they see the canonical string.
 *
 * Mirrored by the User model's beforeValidate hook (defense in depth).
 */
export const EmailSchema = z
  .string()
  .transform(normalizeEmail)
  .pipe(
    z
      .string()
      .min(5, 'Email must be at least 5 characters')
      .max(255, 'Email must be at most 255 characters')
      .email('Please enter a valid email address')
      .refine(
        (email) => {
          const atIndex = email.lastIndexOf('@');
          if (atIndex < 0) return true;
          return isSingleScriptLocalPart(email.slice(0, atIndex));
        },
        { message: 'Email local part must not mix characters from multiple scripts' }
      )
  );

/**
 * Strong password — 8+ chars, must contain lowercase, uppercase, digit,
 * and one of @$!%*?&. Matches the regex used today in
 * auth.controller.validateRegister.
 */
export const StrongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(255, 'Password must be at most 255 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a digit')
  .regex(/[@$!%*?&]/, 'Password must contain a special character (@$!%*?&)');

/**
 * Phone number — 10–20 digits after light normalization (whitespace and
 * separators stripped). Matches User.phoneNumber's isNullOrValidLength
 * validator. Full E.164 normalization is deferred to a libphonenumber
 * pass (see plan 3.3).
 */
export const PhoneNumberSchema = z
  .string()
  .transform((v) => v.trim().replace(/[\s\-()]/g, ''))
  .pipe(
    z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(20, 'Phone number must be at most 20 digits')
  );

const NameSchema = z.string().trim().min(1).max(100);

// ----- Profile / read shape ----------------------------------------------

export const UserProfileSchema = z.object({
  userId: UserIdSchema,
  email: EmailSchema,
  firstName: NameSchema.optional(),
  lastName: NameSchema.optional(),
  phoneNumber: PhoneNumberSchema.nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  status: UserStatusSchema,
  userType: UserTypeSchema,
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ----- Request shapes ----------------------------------------------------

/**
 * POST /api/v1/auth/register — payload from sign-up forms.
 *
 * The backend express-validator chain accepts snake_case (first_name) and
 * the service.backend controller maps it. The new shape enforces the
 * camelCase form that lib.auth's RegisterForm already submits; the
 * controller adapter layer can translate snake_case at the edge during
 * the migration if needed.
 */
// userType is intentionally absent — public registration always creates 'adopter'.
// Elevation to rescue_staff/admin/moderator must go through authenticated,
// role-gated invitation/promotion endpoints.
export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: StrongPasswordSchema,
  firstName: NameSchema,
  lastName: NameSchema,
  phoneNumber: PhoneNumberSchema.optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
  twoFactorToken: z
    .string()
    .min(6, '2FA token must be at least 6 characters')
    .max(8, '2FA token must be at most 8 characters')
    .optional(),
  rememberMe: z.boolean().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RequestPasswordResetSchema = z.object({
  email: EmailSchema,
});
export type RequestPasswordReset = z.infer<typeof RequestPasswordResetSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: StrongPasswordSchema,
});
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;

// ADS Batch KK: email-bootstrapped 2FA recovery. Request mirrors the
// password-reset shape (email only); confirm takes only the token from
// the email link — the capability IS the token.
export const RequestTwoFactorRecoverySchema = z.object({
  email: EmailSchema,
});
export type RequestTwoFactorRecovery = z.infer<typeof RequestTwoFactorRecoverySchema>;

export const ConfirmTwoFactorRecoverySchema = z.object({
  token: z.string().min(1, 'Recovery token is required'),
});
export type ConfirmTwoFactorRecovery = z.infer<typeof ConfirmTwoFactorRecoverySchema>;

/**
 * Inline location block on profile update. Mirrors the express-validator
 * chain in auth.controller.validateUpdateProfile so behaviour is unchanged.
 */
export const UserLocationSchema = z.object({
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  address: z.string().trim().max(255).optional(),
  zipCode: z.string().trim().max(20).optional(),
});
export type UserLocation = z.infer<typeof UserLocationSchema>;

export const UpdateProfileRequestSchema = z.object({
  firstName: NameSchema.optional(),
  lastName: NameSchema.optional(),
  phoneNumber: PhoneNumberSchema.optional(),
  bio: z.string().trim().max(500).optional(),
  profileImageUrl: z.string().url().optional(),
  dateOfBirth: z.coerce.date().optional(),
  location: UserLocationSchema.optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

/**
 * Schema used by the in-process beforeValidate hook on the User model.
 * Strict enough to catch shape violations early but permissive about
 * fields the model owns internally (timestamps, hashed columns, locks).
 *
 * partial() because the hook fires on partial updates too; the Sequelize
 * column-level allowNull / required checks still own "must be present".
 */
export const UserModelShapeSchema = UserProfileSchema.partial().extend({
  password: z.string().min(1).optional(),
});
export type UserModelShape = z.infer<typeof UserModelShapeSchema>;

/**
 * POST /api/v1/users/bulk-update — admin bulk operation.
 *
 * `updateData` is intentionally a strict allowlist: only `status` may be
 * changed in bulk. Privilege-sensitive fields (userType, emailVerified,
 * twoFactorEnabled, twoFactorSecret, password, loginAttempts, lockedUntil,
 * roles) are excluded to prevent mass privilege-escalation. .strict() causes
 * Zod to reject any key not listed here with a clear validation error.
 */
export const BulkUserUpdateDataSchema = z
  .object({
    status: UserStatusSchema.optional(),
  })
  .strict();
export type BulkUserUpdateData = z.infer<typeof BulkUserUpdateDataSchema>;

export const BulkUserUpdateRequestSchema = z.object({
  userIds: z
    .array(z.string().uuid('Each user ID must be a valid UUID'))
    .min(1, 'At least one user ID is required')
    .max(100, 'Cannot update more than 100 users at a time'),
  updateData: BulkUserUpdateDataSchema,
  // ADS-651: capture the operator's reason for the bulk state change so it
  // can be surfaced in the audit log alongside the per-user update list.
  reason: z.string().trim().min(1, 'Reason is required').max(500).optional(),
});
export type BulkUserUpdateRequest = z.infer<typeof BulkUserUpdateRequestSchema>;

/**
 * Response shape for POST /api/v1/users/bulk-update.
 *
 * Aggregate counts (`success`, `failed`) are kept for backward
 * compatibility with existing callers. `failedIds` is always present
 * (may be empty) so the admin UI can light up per-item retry without
 * re-fetching to diff the input. `results` is optional finer-grained
 * detail.
 */
export const BulkUserUpdateResponseSchema = z
  .object({
    success: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  })
  .merge(BulkOperationFailedIdsSchema);
export type BulkUserUpdateResponse = z.infer<typeof BulkUserUpdateResponseSchema>;
