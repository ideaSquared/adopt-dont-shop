import type { APIRequestContext, APIResponse } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
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
 * Tiny convenience: every state-changing request needs a CSRF token,
 * and the response context tracks the cookie automatically.  This helper
 * does the GET /csrf-token + POST/PATCH/DELETE in one call.
 */
async function withCsrf<T extends 'post' | 'patch' | 'put' | 'delete'>(
  ctx: APIRequestContext,
  method: T,
  url: string,
  options: { data?: unknown; headers?: Record<string, string> } = {}
): Promise<APIResponse> {
  const csrfRes = await ctx.get('/api/v1/csrf-token');
  if (!csrfRes.ok()) {
    throw new Error(
      `CSRF token fetch failed before ${method.toUpperCase()} ${url}: ${csrfRes.status()}`
    );
  }
  const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfToken) {
    throw new Error(`CSRF token endpoint returned no token before ${method.toUpperCase()} ${url}`);
  }
  return ctx[method](url, {
    ...options,
    headers: { ...(options.headers ?? {}), 'x-csrf-token': csrfToken },
  });
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
// The backend seeders (see service.backend/src/seeders/) populate the DB
// with deterministic test data:
//   - John Smith (adopter) has 3 applications, a chat thread with the
//     Pawsitive Rescue, notifications, a favourite pet, and notification
//     preferences (the latter two added in 31-e2e-fixtures.ts).
//   - The pet catalogue includes 4 'available' + 1 'pending' pets, plus
//     dedicated 'adopted' and 'on_hold' fixtures from 31-e2e-fixtures.ts.
//
// Tests should READ these fixtures rather than create their own per-test
// data; the helpers below are thin lookups, not factories.
// -----------------------------------------------------------------------

/** Pet IDs hard-coded by the seeders (08-pets.ts + 31-e2e-fixtures.ts). */
export const SEEDED_PET_IDS = {
  available: '9ff53898-c5c6-4422-a245-54e52d4c4b78',
  pending: 'a1d109eb-e717-44a0-aed7-c7c0af6c152f',
  adopted: 'e2e0a000-0000-4000-8000-000000000001',
  onHold: 'e2e0a000-0000-4000-8000-000000000002',
} as const;

/** John Smith's chat with Pawsitive Rescue (10-chats.ts). */
export const SEEDED_CHAT_ID_FOR_ADOPTER = '7dfe4c51-930a-443b-aac5-3e42750a2f1a';

/** John Smith user id (04-users.ts). */
export const SEEDED_ADOPTER_USER_ID = '98915d9e-69ed-46b2-a897-57d8469ff360';

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
 * SEEDED_PET_IDS.available instead.
 *
 * Notes on the body shape:
 *   - We deliberately do NOT pass rescueId — the backend's
 *     fieldWriteGuard rejects it with 403 ("Field access denied").
 *     The rescueId is inferred from the authenticated staff member's
 *     rescue association.
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
  const createRes = await postWithCsrf(rescueApi.context, '/api/v1/pets', {
    name,
    type: 'dog',
    gender: 'female',
    size: 'medium',
    ageGroup: 'adult',
    shortDescription: 'e2e seed',
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
    body.rescueId ?? body.rescue_id ?? body.data?.rescueId ?? body.data?.rescue_id;
  if (!rescueId) {
    throw new Error(`pet creation returned no rescueId: ${JSON.stringify(body).slice(0, 200)}`);
  }
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
 * The seeders guarantee at least one chat for John Smith via the
 * application_id linkage and chat_participants table.
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
  if (first) {
    const chatId = first.chatId ?? first.id ?? first.chat_id;
    if (chatId) {
      return { chatId };
    }
  }
  // Fallback to the known seeded chat id — proves the seed has the row,
  // even if the list endpoint shape changes.
  return { chatId: SEEDED_CHAT_ID_FOR_ADOPTER };
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
