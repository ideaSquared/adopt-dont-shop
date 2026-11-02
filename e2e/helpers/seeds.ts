import type { APIRequestContext, APIResponse } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { withCsrfHeader } from './csrf';
import { uniquePetName } from './factories';

/**
 * Throw with the response status + body when an API call doesn't return
 * a 2xx.  Lets a single failed test point at the specific HTTP error
 * instead of an opaque `expect(true).toBe(false)` from a CI annotation.
 */
export async function expectOk(res: APIResponse, label: string): Promise<void> {
  if (!res.ok()) {
    let body: string;
    try {
      body = (await res.text()).slice(0, 500);
    } catch {
      body = '<unreadable>';
    }
    throw new Error(`${label} failed: ${res.status()} ${body}`);
  }
}

/**
 * Issue a state-changing request through the gateway's CSRF double-submit
 * gate (ADS-919). It fetches GET /api/v1/csrf-token on this context (setting
 * the `csrfToken` cookie) and echoes the value back as the `x-csrf-token`
 * header — the same handshake the SPA performs — so the mutation is accepted
 * whether the context authenticates by Bearer header or by session cookie.
 * See helpers/csrf.ts (the handshake is cached per context).
 */
async function withCsrf<T extends 'post' | 'patch' | 'put' | 'delete'>(
  ctx: APIRequestContext,
  method: T,
  url: string,
  options: { data?: unknown; headers?: Record<string, string> } = {}
): Promise<APIResponse> {
  const headers = await withCsrfHeader(ctx, options.headers);
  return ctx[method](url, { ...options, headers });
}

export const postWithCsrf = (
  ctx: APIRequestContext,
  url: string,
  data?: unknown,
  headers?: Record<string, string>
) => withCsrf(ctx, 'post', url, { data, headers });

export const patchWithCsrf = (
  ctx: APIRequestContext,
  url: string,
  data?: unknown,
  headers?: Record<string, string>
) => withCsrf(ctx, 'patch', url, { data, headers });

export const putWithCsrf = (
  ctx: APIRequestContext,
  url: string,
  data?: unknown,
  headers?: Record<string, string>
) => withCsrf(ctx, 'put', url, { data, headers });

export const deleteWithCsrf = (
  ctx: APIRequestContext,
  url: string,
  headers?: Record<string, string>
) => withCsrf(ctx, 'delete', url, { headers });

// -----------------------------------------------------------------------
// SEED FIXTURE ACCESSORS
//
// `pnpm db:seed` (scripts/seed.mjs) generates the dev/e2e personas through the
// API, so nothing it creates has a fixed id. The data is defined in
// scripts/lib/seed-personas.mjs:
//   - John Smith (adopter) has an under-review application for Luna, an
//     enquiry chat with Paws Rescue about Buddy, and favourites (Buddy, Luna).
//     Buddy has no application from him, so the /apply form for Buddy opens.
//   - Paws Rescue (the `rescue` persona's rescue) owns Buddy (available),
//     Luna (pending) and Max (adopted).
//
// Tests should READ these fixtures rather than create their own per-test
// data; the helpers below are thin lookups, not factories.
// -----------------------------------------------------------------------

/** Names of the seeded Paws Rescue pets, by the status each is seeded in. */
export const SEEDED_PETS = {
  available: 'Buddy',
  pending: 'Luna',
  adopted: 'Max',
} as const;

/**
 * Look up a seeded pet's id by name. Uses the rescue-staff client because
 * the pets are Paws Rescue's, and adopted pets are hidden from everyone but
 * their own rescue.
 */
export async function seededPetId(
  rescueApi: ApiClient,
  status: keyof typeof SEEDED_PETS
): Promise<string> {
  const name = SEEDED_PETS[status];
  const rescueId = await getMyRescueId(rescueApi);
  if (!rescueId) {
    throw new Error('could not resolve the rescue staff persona’s rescueId');
  }
  const res = await rescueApi.context.get('/api/v1/pets', {
    params: { rescueId, search: name, status: 'all', limit: 100 },
  });
  await expectOk(res, `GET /pets?search=${name}`);
  const body = (await res.json()) as { data?: Array<{ pet_id?: string; name?: string }> };
  const petId = body.data?.find(p => p.name === name)?.pet_id;
  if (!petId) {
    throw new Error(`seeded pet ${name} not found — run \`pnpm db:seed\` first`);
  }
  return petId;
}

/**
 * Resolve the rescue ID associated with a rescue-staff API client.  The
 * field lives at slightly different paths on different builds; check
 * /auth/me and /staff/me before giving up.
 */
export async function getMyRescueId(rescueApi: ApiClient): Promise<string | null> {
  const meRes = await rescueApi.context.get('/api/v1/auth/me');
  if (meRes.ok()) {
    const me = (await meRes.json()) as {
      user?: { rescueId?: string; rescue_id?: string };
      rescueId?: string;
      rescue_id?: string;
    };
    const id = me.user?.rescueId ?? me.user?.rescue_id ?? me.rescueId ?? me.rescue_id;
    if (id) {
      return id;
    }
  }
  const staffRes = await rescueApi.context.get('/api/v1/staff/me');
  if (staffRes.ok()) {
    const body = (await staffRes.json()) as {
      data?: { rescueId?: string; rescue_id?: string };
      rescueId?: string;
      rescue_id?: string;
      rescue?: { rescueId?: string; rescue_id?: string; id?: string };
    };
    return (
      body.data?.rescueId ??
      body.data?.rescue_id ??
      body.rescueId ??
      body.rescue_id ??
      body.rescue?.rescueId ??
      body.rescue?.rescue_id ??
      body.rescue?.id ??
      null
    );
  }
  return null;
}

/**
 * Create a brand-new available pet attached to the rescue user's rescue.
 * Used by tests that legitimately need uniqueness (rescue publishes a
 * pet → adopter sees it in search).  Read-side tests should use
 * seededPetId(rescueApi, 'available') instead.
 *
 * Notes on the body shape:
 *   - The pets service requires rescue_id on create (handlers.ts:
 *     "rescue_id is required") and the gateway maps it straight from the
 *     request body — it does NOT infer it from the principal — so we
 *     resolve the staff member's rescue and pass it explicitly. The
 *     service still authorises the create against that rescueId.
 *   - We deliberately do NOT pass status — explicit values trip a
 *     Postgres ENUM type-mismatch ("column status is of type
 *     enum_pets_status but expression is of type
 *     enum_pet_status_transitions_to_status").  The Pet model defaults
 *     status to AVAILABLE, which is what we want anyway.
 */
export async function createAvailablePet(
  rescueApi: ApiClient,
  namePrefix = 'Seed'
): Promise<{ petId: string; name: string; rescueId: string }> {
  const name = uniquePetName(namePrefix);
  const staffRescueId = await getMyRescueId(rescueApi);
  if (!staffRescueId) {
    throw new Error('could not resolve the rescue staff persona’s rescueId before creating a pet');
  }
  const createRes = await postWithCsrf(rescueApi.context, '/api/v1/pets', {
    name,
    type: 'dog',
    gender: 'female',
    size: 'medium',
    ageGroup: 'adult',
    shortDescription: 'e2e seed',
    rescueId: staffRescueId,
  });
  if (!createRes.ok()) {
    throw new Error(
      `pet creation failed: ${createRes.status()} ${(await createRes.text()).slice(0, 300)}`
    );
  }
  type PetCreateResponse = {
    petId?: string;
    id?: string;
    pet_id?: string;
    rescueId?: string;
    rescue_id?: string;
    data?: {
      petId?: string;
      id?: string;
      pet_id?: string;
      rescueId?: string;
      rescue_id?: string;
    };
  };
  const body = (await createRes.json()) as PetCreateResponse;
  const petId =
    body.petId ?? body.id ?? body.pet_id ?? body.data?.petId ?? body.data?.id ?? body.data?.pet_id;
  if (!petId) {
    throw new Error(`pet creation returned no id: ${JSON.stringify(body).slice(0, 200)}`);
  }
  const rescueId =
    body.rescueId ?? body.rescue_id ?? body.data?.rescueId ?? body.data?.rescue_id ?? staffRescueId;
  return { petId, name, rescueId };
}

/**
 * Read messages from a chat in a shape-tolerant way.  The canonical
 * envelope is { success, data: { messages: [...], pagination: ... } }
 * but older code paths may return the array directly under data or
 * messages.
 */
export async function listChatMessages(
  ctx: APIRequestContext,
  chatId: string
): Promise<Array<{ content?: string; message_id?: string; id?: string }>> {
  const res = await ctx.get(`/api/v1/chats/${chatId}/messages`, { params: { limit: '20' } });
  if (!res.ok()) {
    return [];
  }
  const body = (await res.json()) as {
    data?:
      | Array<{ content?: string; message_id?: string; id?: string }>
      | { messages?: Array<{ content?: string; message_id?: string; id?: string }> };
    messages?: Array<{ content?: string; message_id?: string; id?: string }>;
  };
  if (Array.isArray(body.data)) {
    return body.data;
  }
  if (body.data && Array.isArray(body.data.messages)) {
    return body.data.messages;
  }
  if (Array.isArray(body.messages)) {
    return body.messages;
  }
  return [];
}

/**
 * Pick the first NON-TERMINAL application owned by the seeded adopter
 * (i.e. one that can still legally transition to approved/rejected).
 * The seeders guarantee at least one application in 'submitted' state
 * for John Smith.
 */
export async function getFirstAdopterApplication(adopterApi: ApiClient): Promise<{
  applicationId: string;
  status: string;
}> {
  const res = await adopterApi.context.get('/api/v1/applications', { params: { limit: '20' } });
  if (!res.ok()) {
    throw new Error(
      `applications list failed: ${res.status()} ${(await res.text()).slice(0, 200)}`
    );
  }
  const body = (await res.json()) as {
    data?: Array<{ applicationId?: string; id?: string; status?: string }>;
    applications?: Array<{ applicationId?: string; id?: string; status?: string }>;
  };
  const list = body.data ?? body.applications ?? [];
  if (list.length === 0) {
    throw new Error(
      `expected at least one seeded application for the adopter; got 0 — check 09-applications.ts`
    );
  }
  // Prefer one in a non-terminal state — terminal statuses
  // (approved/rejected/withdrawn) can't transition further, which most
  // call sites need.
  const nonTerminal = list.find(
    a => a.status !== 'approved' && a.status !== 'rejected' && a.status !== 'withdrawn'
  );
  const chosen = nonTerminal ?? list[0]!;
  const applicationId = chosen.applicationId ?? chosen.id;
  if (!applicationId) {
    throw new Error(`first application has no id: ${JSON.stringify(chosen)}`);
  }
  return { applicationId, status: chosen.status ?? 'submitted' };
}

/**
 * Create a fresh application owned by the adopter on a fresh pet.
 * Useful when a test wants to mutate application state without touching
 * the seeded fixtures (which other tests may also be reading).
 */
/**
 * Complete answer set for the 19 required core application questions
 * (see service.backend/src/seeders/reference/application-questions.ts).
 * SELECT answers must match the seeded option list exactly. Optional
 * questions are omitted; the validator only flags missing required ones.
 */
const COMPLETE_APPLICATION_ANSWERS = {
  employment_status: 'Employed full-time',
  hours_from_home: '4–6 hours',
  willing_to_provide_id: true,
  housing_type: 'House',
  home_ownership: 'Own',
  yard_fenced: true,
  household_members: 'Two adults',
  household_all_agree: true,
  experience_level: 'Experienced',
  has_pets: false,
  hours_alone: '2–4 hours',
  exercise_plan: 'Daily walks and weekend hikes',
  pet_sleeping_location: 'Indoors — own bed or crate',
  vet_registered: true,
  pet_costs_prepared: 'Yes — I have budgeted for all ongoing costs',
  pet_if_circumstances_change: 'Return to rescue with full handover',
  why_adopt: 'We have the time, space, and experience to give a pet a great home.',
  agree_home_visit: true,
  agree_terms: true,
} as const;

export async function createAdopterApplication(
  adopterApi: ApiClient,
  rescueApi: ApiClient
): Promise<{ applicationId: string; petId: string }> {
  const pet = await createAvailablePet(rescueApi, 'AppFlow');
  const createRes = await postWithCsrf(adopterApi.context, '/api/v1/applications', {
    petId: pet.petId,
    answers: COMPLETE_APPLICATION_ANSWERS,
    // ADS-535: SUBMITTED applications require the references-consent flag.
    referencesConsented: true,
  });
  if (!createRes.ok()) {
    throw new Error(
      `application creation failed: ${createRes.status()} ${(await createRes.text()).slice(0, 300)}`
    );
  }
  const body = (await createRes.json()) as {
    applicationId?: string;
    id?: string;
    application_id?: string;
    data?: { applicationId?: string; id?: string; application_id?: string };
  };
  const applicationId =
    body.applicationId ??
    body.id ??
    body.application_id ??
    body.data?.applicationId ??
    body.data?.id ??
    body.data?.application_id;
  if (!applicationId) {
    throw new Error(`application creation returned no id`);
  }
  return { applicationId, petId: pet.petId };
}

/**
 * Pick the first chat conversation the seeded adopter participates in.
 * The seed guarantees at least one: John Smith's enquiry about Buddy.
 */
export async function getFirstAdopterChat(adopterApi: ApiClient): Promise<{ chatId: string }> {
  // The chat router is mounted at /api/v1/chats AND /api/v1/conversations.
  // GET / on either returns the user's chats.
  const res = await adopterApi.context.get('/api/v1/chats');
  if (!res.ok()) {
    throw new Error(`chats list failed: ${res.status()} ${(await res.text()).slice(0, 200)}`);
  }
  const body = (await res.json()) as {
    data?: Array<{ chatId?: string; id?: string; chat_id?: string }>;
    chats?: Array<{ chatId?: string; id?: string; chat_id?: string }>;
    conversations?: Array<{ chatId?: string; id?: string; chat_id?: string }>;
  };
  const list = body.data ?? body.chats ?? body.conversations ?? [];
  const first = list[0];
  const chatId = first?.chatId ?? first?.id ?? first?.chat_id;
  if (!chatId) {
    throw new Error('the seeded adopter has no chats — run `pnpm db:seed` first');
  }
  return { chatId };
}

/**
 * Add a pet to the adopter's favourites via API.  No-op if already
 * favourited (the seeder may have done it already).
 */
export async function favouritePet(adopterApi: ApiClient, petId: string): Promise<void> {
  const res = await postWithCsrf(adopterApi.context, `/api/v1/pets/${petId}/favorite`, {});
  if (!res.ok() && res.status() !== 409) {
    throw new Error(`favourite failed: ${res.status()} ${(await res.text()).slice(0, 200)}`);
  }
}

/**
 * Set a pet's status to a given value (rescue/admin scope).
 */
export async function setPetStatus(
  staffApi: ApiClient,
  petId: string,
  status: 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care'
): Promise<void> {
  const res = await patchWithCsrf(staffApi.context, `/api/v1/pets/${petId}`, { status });
  if (!res.ok()) {
    throw new Error(
      `pet status update failed: ${res.status()} ${(await res.text()).slice(0, 200)}`
    );
  }
}
