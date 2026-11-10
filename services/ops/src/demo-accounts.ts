import { ADMIN_USERS_SEARCH, ADMIN_USERS_UPDATE } from '@adopt-dont-shop/lib.types';

import {
  ALPHANUMERIC,
  DEMO_EMAIL_PATTERN,
  generatePassword,
  randomString,
  str,
} from './demo-rescue.js';
import { OpsError } from './errors.js';
import type { CallDownstream, JsonObject } from './registry.js';

// Reusable demo adopter creation, shared by `demo create-adopter` and any demo
// command that needs a throwaway applicant. Public sign-up (`auth.Register`) is
// enumeration-safe and returns no user id, so the new account is looked up by
// its generated email and then activated and verified as an admin would.

export const isDemoEmail = (email: string | undefined): boolean =>
  email !== undefined && DEMO_EMAIL_PATTERN.test(email);

export type DemoAdopter = {
  readonly userId: string;
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
};

const usersIn = (json: JsonObject): readonly JsonObject[] =>
  Array.isArray(json.users)
    ? json.users.filter((v): v is JsonObject => typeof v === 'object' && v !== null)
    : [];

const findUserIdByEmail = async (
  call: CallDownstream,
  email: string
): Promise<string | undefined> => {
  const res = await call(
    'auth.SearchUsers',
    { search: email, limit: 10 },
    { permissions: [ADMIN_USERS_SEARCH] }
  );
  // The search is a substring match, so require the exact address.
  return str(usersIn(res).find(u => str(u.email) === email)?.userId);
};

const withAccountHint = (userId: string, email: string, err: unknown): OpsError => {
  const base =
    err instanceof OpsError
      ? err
      : new OpsError('INTERNAL', 'Unexpected failure', 'Check the service.ops logs.');
  return new OpsError(
    base.code,
    base.message,
    `The account ${userId} (${email}) was already created. Remove it with \`pnpm ops demo delete-adopter ${userId}\`.`
  );
};

// Create a verified, active adopter that can sign in to the client app. Throws
// an OpsError whose hint names the account if a step fails after it exists.
export const createDemoAdopter = async (
  call: CallDownstream,
  options: { readonly firstName?: string } = {}
): Promise<DemoAdopter> => {
  const firstName = options.firstName ?? 'Demo';
  const email = `demo-${randomString(ALPHANUMERIC, 10)}@example.com`;
  const password = generatePassword();

  await call(
    'auth.Register',
    {
      email,
      password,
      firstName,
      lastName: 'Adopter',
      termsAccepted: true,
      privacyPolicyAccepted: true,
    },
    { permissions: [] }
  );

  const userId = await findUserIdByEmail(call, email);
  if (userId === undefined) {
    throw new OpsError(
      'INTERNAL',
      'auth.Register created no account for the generated email',
      `Look for ${email} in the admin app; run the command again if it is absent.`
    );
  }

  try {
    await call(
      'auth.AdminUpdateUser',
      { userId, status: 'USER_STATUS_ACTIVE', emailVerified: true },
      { permissions: [ADMIN_USERS_UPDATE] }
    );
  } catch (err) {
    throw withAccountHint(userId, email, err);
  }

  return { userId, email, password, firstName };
};
