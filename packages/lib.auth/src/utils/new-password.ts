/**
 * The rule every "set a new password" form applies. It is defined once in
 * lib.validation so the forms, the gateway and the auth service all validate
 * against the same schema; it is re-exported here for the auth UI.
 */
export { NewPasswordSchema } from '@adopt-dont-shop/lib.validation';

export const NEW_PASSWORD_HINT =
  'At least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.';
