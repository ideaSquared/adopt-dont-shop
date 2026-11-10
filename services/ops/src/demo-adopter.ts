import { z } from 'zod';

import { ADMIN_USERS_DEACTIVATE, ADMIN_USERS_READ } from '@adopt-dont-shop/lib.types';

import { createDemoAdopter, isDemoEmail } from './demo-accounts.js';
import { objectAt, str } from './demo-rescue.js';
import { OpsError } from './errors.js';
import type { CallDownstream, JsonObject } from './registry.js';

// `pnpm ops demo create-adopter` / `delete-adopter`: a throwaway adopter login
// for testing the client app in dev and staging. There is no RPC that
// soft-deletes a user, so delete-adopter deactivates (the same action the admin
// app uses); the row stays but the account can no longer sign in.

const CreateRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
});

const DeleteRequestSchema = z.object({ userId: z.uuid() });

const parseRequest = <T>(schema: z.ZodType<T>, request: JsonObject): T => {
  const parsed = schema.safeParse(request);
  if (!parsed.success) {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `Invalid request: ${parsed.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      'firstName is 1 to 100 characters; userId is a UUID.'
    );
  }
  return parsed.data;
};

export const validateCreateAdopterRequest = (request: JsonObject): void => {
  parseRequest(CreateRequestSchema, request);
};

export const validateDeleteAdopterRequest = (request: JsonObject): void => {
  parseRequest(DeleteRequestSchema, request);
};

export const createDemoAdopterAccount = async (
  request: JsonObject,
  call: CallDownstream
): Promise<JsonObject> => {
  const input = parseRequest(CreateRequestSchema, request);
  const adopter = await createDemoAdopter(
    call,
    input.firstName === undefined ? {} : { firstName: input.firstName }
  );
  return {
    userId: adopter.userId,
    email: adopter.email,
    password: adopter.password,
    nextSteps: `Sign in to the client app (app.client) with this email and password. Remove it later with \`pnpm ops demo delete-adopter ${adopter.userId}\`.`,
  };
};

export const deleteDemoAdopterAccount = async (
  request: JsonObject,
  call: CallDownstream
): Promise<JsonObject> => {
  const { userId } = parseRequest(DeleteRequestSchema, request);

  const found = await call('auth.AdminGetUser', { userId }, { permissions: [ADMIN_USERS_READ] });
  const user = objectAt(found, 'user');
  if (!isDemoEmail(str(user.email))) {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `User ${userId} is not a demo account`,
      'delete-adopter only deactivates accounts made by `pnpm ops demo create-adopter`.'
    );
  }

  await call(
    'auth.DeactivateUser',
    { userId, reason: 'Demo adopter removed' },
    { permissions: [ADMIN_USERS_DEACTIVATE] }
  );
  return { userId, status: 'deactivated' };
};
