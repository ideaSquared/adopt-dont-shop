import { randomInt } from 'node:crypto';

import { z } from 'zod';

import {
  ADMIN_SECURITY_MANAGE,
  ADMIN_USERS_DEACTIVATE,
  ADMIN_USERS_READ,
  ADMIN_USERS_UPDATE,
  PETS_CREATE,
  PETS_DELETE,
  PETS_MANAGE_ANY,
  PETS_VIEW,
} from '@adopt-dont-shop/lib.types';
import { NewPasswordSchema } from '@adopt-dont-shop/lib.validation';

import { OpsError } from './errors.js';
import type { CallDownstream, JsonObject } from './registry.js';

// `pnpm ops demo create-rescue` / `delete-rescue`: throwaway rescues for testing
// in dev and staging. Each step calls an existing RPC with a principal holding
// only the permissions that handler checks. Nothing here rolls back across
// services: a failure names what was already created so it can be deleted.

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*-_=+';
const PASSWORD_BODY_LENGTH = 16;
const MAX_PETS = 10;
const DEFAULT_PETS = 3;
const PET_PAGE_LIMIT = 100;
const MAX_PET_PAGES = 50;

// Demo owners get generated addresses on example.com (reserved, never
// delivered). delete-rescue only acts on rescues whose email matches.
const DEMO_EMAIL_PATTERN = /^demo-[a-z0-9]{10}@example\.com$/;

const pick = (alphabet: string): string => alphabet[randomInt(alphabet.length)];
const randomString = (alphabet: string, length: number): string =>
  Array.from({ length }, () => pick(alphabet)).join('');

const generatePassword = (): string => {
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const password = [
    pick(UPPER),
    pick(LOWER),
    pick(DIGITS),
    pick(SYMBOLS),
    randomString(all, PASSWORD_BODY_LENGTH),
  ].join('');
  // The auth service enforces the same rule; failing here is a generator bug.
  return NewPasswordSchema.parse(password);
};

const SAMPLE_PETS = [
  { name: 'Biscuit', type: 'PET_TYPE_DOG', gender: 'PET_GENDER_MALE', size: 'PET_SIZE_MEDIUM' },
  { name: 'Luna', type: 'PET_TYPE_CAT', gender: 'PET_GENDER_FEMALE', size: 'PET_SIZE_SMALL' },
  { name: 'Bramble', type: 'PET_TYPE_DOG', gender: 'PET_GENDER_FEMALE', size: 'PET_SIZE_LARGE' },
  { name: 'Otis', type: 'PET_TYPE_CAT', gender: 'PET_GENDER_MALE', size: 'PET_SIZE_SMALL' },
  { name: 'Pepper', type: 'PET_TYPE_RABBIT', gender: 'PET_GENDER_FEMALE', size: 'PET_SIZE_SMALL' },
] as const;

const AGE_GROUPS = ['PET_AGE_GROUP_YOUNG', 'PET_AGE_GROUP_ADULT', 'PET_AGE_GROUP_SENIOR'] as const;

const CreateRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  petCount: z.number().int().min(0).max(MAX_PETS).optional(),
});

const DeleteRequestSchema = z.object({ rescueId: z.uuid() });

const parseRequest = <T>(schema: z.ZodType<T>, request: JsonObject): T => {
  const parsed = schema.safeParse(request);
  if (!parsed.success) {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `Invalid request: ${parsed.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      `petCount is 0 to ${MAX_PETS}; rescueId is a UUID.`
    );
  }
  return parsed.data;
};

export const validateCreateRequest = (request: JsonObject): void => {
  parseRequest(CreateRequestSchema, request);
};

export const validateDeleteRequest = (request: JsonObject): void => {
  parseRequest(DeleteRequestSchema, request);
};

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const objectAt = (json: JsonObject, key: string): JsonObject => {
  const value = json[key];
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject) // narrowed: a non-null, non-array object
    : {};
};

const arrayAt = (json: JsonObject, key: string): readonly JsonObject[] => {
  const value = json[key];
  return Array.isArray(value)
    ? value.filter((v): v is JsonObject => typeof v === 'object' && v !== null)
    : [];
};

// Re-throw a step failure with the ids created so far in the hint.
const withCreated = async <T>(created: readonly string[], step: () => Promise<T>): Promise<T> => {
  try {
    return await step();
  } catch (err) {
    if (created.length === 0) {
      throw err;
    }
    const base =
      err instanceof OpsError
        ? err
        : new OpsError('INTERNAL', 'Unexpected failure', 'Check the service.ops logs.');
    throw new OpsError(
      base.code,
      base.message,
      `Already created: ${created.join(', ')}. Remove it with \`pnpm ops demo delete-rescue <rescueId>\` (or deactivate the owner with \`pnpm ops auth deactivate-user <userId>\` if no rescue was made).`
    );
  }
};

export const createDemoRescue = async (
  request: JsonObject,
  call: CallDownstream
): Promise<JsonObject> => {
  const input = parseRequest(CreateRequestSchema, request);
  const id = randomString(ALPHANUMERIC, 10);
  const email = `demo-${id}@example.com`;
  const password = generatePassword();
  const rescueName = input.name ?? `Demo Rescue ${id.slice(0, 6)}`;
  const petCount = input.petCount ?? DEFAULT_PETS;
  const created: string[] = [];

  const registered = await call(
    'auth.RegisterRescueOwner',
    { email, password, firstName: 'Demo', lastName: 'Owner' },
    { permissions: [] }
  );
  const ownerUserId = str(objectAt(registered, 'user').userId);
  if (ownerUserId === undefined) {
    throw new OpsError(
      'ALREADY_EXISTS',
      'auth.RegisterRescueOwner created no owner account (the generated email is already in use)',
      'Run the command again; it generates a new address each time.'
    );
  }
  created.push(`owner user ${ownerUserId}`);

  await withCreated(created, () =>
    call(
      'auth.AdminUpdateUser',
      { userId: ownerUserId, status: 'USER_STATUS_ACTIVE', emailVerified: true },
      { permissions: [ADMIN_USERS_UPDATE] }
    )
  );

  const rescue = await withCreated(created, () =>
    call(
      'rescue.RegisterRescue',
      {
        ownerUserId,
        rescue: {
          name: rescueName,
          email,
          address: '1 Demo Street',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'GB',
          description: 'A demo rescue for testing. Safe to delete.',
          contactPerson: 'Demo Owner',
          contactEmail: email,
        },
      },
      { permissions: [] }
    )
  );
  const rescueId = str(objectAt(rescue, 'rescue').rescueId);
  if (rescueId === undefined) {
    throw new OpsError(
      'INTERNAL',
      'rescue.RegisterRescue returned no rescue id',
      `Already created: owner user ${ownerUserId}. Deactivate it with \`pnpm ops auth deactivate-user ${ownerUserId}\`.`
    );
  }
  created.unshift(`rescue ${rescueId}`);

  await withCreated(created, () =>
    call(
      'rescue.Verify',
      {
        rescueId,
        toStatus: 'RESCUE_STATUS_VERIFIED',
        verificationSource: 'RESCUE_VERIFICATION_SOURCE_MANUAL',
      },
      { permissions: [ADMIN_SECURITY_MANAGE] }
    )
  );

  const petIds = await Array.from({ length: petCount }, (_, i) => i).reduce<Promise<string[]>>(
    async (soFar, i) => {
      const ids = await soFar;
      const sample = SAMPLE_PETS[i % SAMPLE_PETS.length];
      const pet = await withCreated([...created, ...ids.map(p => `pet ${p}`)], () =>
        call(
          'pets.Create',
          {
            rescueId,
            name: i < SAMPLE_PETS.length ? sample.name : `${sample.name} ${i + 1}`,
            type: sample.type,
            gender: sample.gender,
            size: sample.size,
            ageGroup: AGE_GROUPS[i % AGE_GROUPS.length],
            shortDescription: 'A demo pet for testing.',
          },
          { permissions: [PETS_CREATE, PETS_MANAGE_ANY], rescueId }
        )
      );
      const petId = str(objectAt(pet, 'pet').petId);
      return petId === undefined ? ids : [...ids, petId];
    },
    Promise.resolve([])
  );

  return {
    rescueId,
    rescueName,
    ownerUserId,
    ownerEmail: email,
    ownerPassword: password,
    petIds,
    nextSteps: `Sign in to the rescue app with this email and password. Remove it later with \`pnpm ops demo delete-rescue ${rescueId}\`.`,
  };
};

const listAllPetIds = async (call: CallDownstream, rescueId: string): Promise<string[]> => {
  const page = async (cursor: string | undefined, n: number): Promise<string[]> => {
    const res = await call(
      'pets.List',
      { rescueIdFilter: rescueId, limit: PET_PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
      { permissions: [PETS_VIEW], rescueId }
    );
    const ids = arrayAt(res, 'pets').flatMap(p => str(p.petId) ?? []);
    const next = str(res.nextCursor);
    return next === undefined || n + 1 >= MAX_PET_PAGES
      ? ids
      : [...ids, ...(await page(next, n + 1))];
  };
  return page(undefined, 0);
};

export const deleteDemoRescue = async (
  request: JsonObject,
  call: CallDownstream
): Promise<JsonObject> => {
  const { rescueId } = parseRequest(DeleteRequestSchema, request);

  // A demo rescue is one whose staff are all demo accounts. The rescue's own
  // email can't be checked: rescue.Get zeroes every field for an operator
  // principal, which carries no roles. Staff are read before the rescue is
  // deleted, since staff lookups need it.
  const staff = await call(
    'rescue.ListStaffMembers',
    { rescueId },
    { permissions: [ADMIN_SECURITY_MANAGE] }
  );
  const staffUserIds = arrayAt(staff, 'staffMembers').flatMap(m => str(m.userId) ?? []);
  const staffEmails = await staffUserIds.reduce<Promise<string[]>>(async (soFar, userId) => {
    const emails = await soFar;
    const user = await call('auth.AdminGetUser', { userId }, { permissions: [ADMIN_USERS_READ] });
    return [...emails, str(objectAt(user, 'user').email) ?? ''];
  }, Promise.resolve([]));
  if (staffEmails.length === 0 || !staffEmails.every(email => DEMO_EMAIL_PATTERN.test(email))) {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `Rescue ${rescueId} is not a demo rescue`,
      'delete-rescue only removes rescues made by `pnpm ops demo create-rescue`, whose staff are all demo accounts.'
    );
  }
  const demoUserIds = staffUserIds;

  // Pets live in their own schema and do not see the rescue's soft delete, so
  // each is soft-deleted to take it off public listings.
  const petIds = await listAllPetIds(call, rescueId);
  await petIds.reduce<Promise<void>>(async (prev, petId) => {
    await prev;
    await call('pets.Delete', { petId }, { permissions: [PETS_DELETE, PETS_MANAGE_ANY], rescueId });
  }, Promise.resolve());

  await call('rescue.Delete', { rescueId }, { permissions: [ADMIN_SECURITY_MANAGE] });

  await demoUserIds.reduce<Promise<void>>(async (prev, userId) => {
    await prev;
    await call(
      'auth.DeactivateUser',
      { userId, reason: 'Demo rescue removed' },
      { permissions: [ADMIN_USERS_DEACTIVATE] }
    );
  }, Promise.resolve());

  return { rescueId, deletedPetIds: petIds, deactivatedUserIds: demoUserIds };
};
