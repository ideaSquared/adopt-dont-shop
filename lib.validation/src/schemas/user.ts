import { z } from 'zod';
import type { UserId } from '@adopt-dont-shop/lib.types';

/**
 * Canonical Zod schemas for the User domain.
 *
 * One source of truth for User-shaped data, used by:
 *  - service.backend request validation (replacing express-validator)
 *  - service.backend Sequelize beforeValidate cross-check
 *  - frontend forms via lib.auth (LoginForm, RegisterForm, ProfileForm)
 *
 * The schema definitions deliberately match the Sequelize column-level
 * validators in service.backend/src/models/User.ts. Drift between the
 * two is what we're trying to eliminate.
 */

// ----- Enums (match the values exported from User.ts) ---------------------

export const UserStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'pending_verification',
  'deactivated',
]);
export type UserStatusValue = z.infer<typeof UserStatusSchema>;

export const UserTypeSchema = z.enum(['adopter', 'rescue_staff', 'admin', 'moderator']);
export type UserTypeValue = z.infer<typeof UserTypeSchema>;

// ----- Primitives ---------------------------------------------------------

export const UserIdSchema = z
  .string()
  .min(1, 'User ID is required')
  .transform((v) => v as UserId);

/**
 * Canonical email rule. Trim + lowercase happens server-side in the User
 * beforeValidate hook; the schema only enforces format and length.
 */
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be at most 255 characters')
  .email('Please enter a valid email address');

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
export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: StrongPasswordSchema,
  firstName: NameSchema,
  lastName: NameSchema,
  phoneNumber: PhoneNumberSchema.optional(),
  userType: UserTypeSchema.optional(),
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
