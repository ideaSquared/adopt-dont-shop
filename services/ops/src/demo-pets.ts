import { z } from 'zod';

import { PETS_DELETE, PETS_MANAGE_ANY } from '@adopt-dont-shop/lib.types';

import { DEMO_TAG, createSamplePets, listAllPets, str } from './demo-rescue.js';
import { OpsError } from './errors.js';
import type { CallDownstream, JsonObject } from './registry.js';

// `pnpm ops demo create-pets` / `delete-pets`: sample pets for any verified
// rescue in dev and staging. Pets made here carry the "demo" tag; delete-pets
// removes only pets with that tag, so a rescue's real pets are never touched.

const MAX_COUNT = 25;
const DEFAULT_COUNT = 5;

const CreateRequestSchema = z.object({
  rescueId: z.uuid(),
  count: z.number().int().min(1).max(MAX_COUNT).optional(),
});
const DeleteRequestSchema = z.object({ rescueId: z.uuid() });

const parseRequest = <T>(schema: z.ZodType<T>, request: JsonObject): T => {
  const parsed = schema.safeParse(request);
  if (!parsed.success) {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `Invalid request: ${parsed.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      `count is 1 to ${MAX_COUNT}; rescueId is a UUID.`
    );
  }
  return parsed.data;
};

export const validateCreatePetsRequest = (request: JsonObject): void => {
  parseRequest(CreateRequestSchema, request);
};

export const validateDeletePetsRequest = (request: JsonObject): void => {
  parseRequest(DeleteRequestSchema, request);
};

const deleteCommand = (rescueId: string): string => `pnpm ops demo delete-pets ${rescueId}`;

export const createDemoPets = async (
  request: JsonObject,
  call: CallDownstream
): Promise<JsonObject> => {
  const { rescueId, count = DEFAULT_COUNT } = parseRequest(CreateRequestSchema, request);

  // No permissions on purpose: rescue.Get shows a rescue to a caller without
  // rescues.read only when it is verified, and answers NOT_FOUND otherwise. The
  // response fields are masked for a role-less principal, so the status itself
  // cannot be read; the call succeeding is the check.
  await call('rescue.Get', { rescueId }, { permissions: [] }).catch((err: unknown) => {
    if (err instanceof OpsError && err.code === 'NOT_FOUND') {
      throw new OpsError(
        'NOT_FOUND',
        `Rescue ${rescueId} does not exist or is not verified`,
        'Check the id and environment. Pets can only be added to a verified rescue.'
      );
    }
    throw err;
  });

  const petIds = await createSamplePets(call, {
    rescueId,
    count,
    created: [],
    tags: [DEMO_TAG],
    cleanup: `Remove them with \`${deleteCommand(rescueId)}\`.`,
  });

  return {
    rescueId,
    petIds,
    nextSteps: `Sign in to the rescue app as a member of this rescue to see them. Remove them later with \`${deleteCommand(rescueId)}\`.`,
  };
};

const hasDemoTag = (pet: JsonObject): boolean => {
  const raw = str(pet.tagsJson);
  if (raw === undefined) {
    return false;
  }
  try {
    const tags: unknown = JSON.parse(raw);
    return Array.isArray(tags) && tags.includes(DEMO_TAG);
  } catch {
    return false;
  }
};

export const deleteDemoPets = async (
  request: JsonObject,
  call: CallDownstream
): Promise<JsonObject> => {
  const { rescueId } = parseRequest(DeleteRequestSchema, request);

  const petIds = (await listAllPets(call, rescueId))
    .filter(hasDemoTag)
    .flatMap(p => str(p.petId) ?? []);

  await petIds.reduce<Promise<void>>(async (prev, petId) => {
    await prev;
    await call('pets.Delete', { petId }, { permissions: [PETS_DELETE, PETS_MANAGE_ANY], rescueId });
  }, Promise.resolve());

  return { rescueId, deletedPetIds: petIds };
};
