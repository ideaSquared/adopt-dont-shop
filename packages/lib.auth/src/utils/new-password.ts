import { StrongPasswordSchema } from '@adopt-dont-shop/lib.validation';

/**
 * The rule every "set a new password" form applies: the canonical strong
 * password policy, capped at 128 characters because the gateway rejects
 * longer passwords (services/gateway/src/routes/auth.schemas.ts).
 */
export const NewPasswordSchema = StrongPasswordSchema.max(
  128,
  'Password must be at most 128 characters'
);

export const NEW_PASSWORD_HINT =
  'At least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.';
