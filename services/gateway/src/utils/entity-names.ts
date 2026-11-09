// Human-readable names for ids that other services own.
//
// Service responses carry only foreign ids (a chat's pet_id, a report's
// reporter_id, an audit event's aggregate_id). The gateway resolves the
// display names the SPAs render, one lookup per distinct id: there is no
// batch RPC and pages are small. A per-id failure (unknown, soft-deleted,
// permission denied, client unavailable) leaves that id unresolved rather
// than failing the request, and a missing client skips the dimension.

import type { Metadata } from '@grpc/grpc-js';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';

// Resolve a set of ids to records, deduped, tolerating per-id failures.
// `fetch` returns undefined when its client is absent (optional-chaining
// short-circuit) or the record has nothing to show, which is treated the
// same as a failed lookup.
export async function lookupById<T>(
  ids: ReadonlyArray<string>,
  fetch: (id: string) => Promise<T | undefined> | undefined
): Promise<Map<string, T>> {
  const unique = [...new Set(ids.filter(id => id !== ''))];
  const map = new Map<string, T>();
  await Promise.all(
    unique.map(async id => {
      try {
        const value = await fetch(id);
        if (value !== undefined) {
          map.set(id, value);
        }
      } catch {
        // Tolerated: leave this id unresolved so its name renders empty.
      }
    })
  );
  return map;
}

const nonEmpty = (value: string | undefined): string | undefined =>
  value !== undefined && value !== '' ? value : undefined;

export const lookupPetNames = (
  ids: ReadonlyArray<string>,
  petsClient: PetsClient | undefined,
  metadata: Metadata
): Promise<Map<string, string>> =>
  lookupById(ids, id => petsClient?.get({ petId: id }, metadata).then(r => nonEmpty(r.pet?.name)));

export const lookupRescueNames = (
  ids: ReadonlyArray<string>,
  rescueClient: RescueClient | undefined,
  metadata: Metadata
): Promise<Map<string, string>> =>
  lookupById(ids, id =>
    rescueClient?.get({ rescueId: id }, metadata).then(r => nonEmpty(r.rescue?.name))
  );

export const lookupUserNames = (
  ids: ReadonlyArray<string>,
  authClient: AuthClient | undefined,
  metadata: Metadata
): Promise<Map<string, string>> =>
  lookupById(ids, id =>
    authClient
      ?.getUserName({ userId: id }, metadata)
      .then(r => nonEmpty([r.firstName, r.lastName].filter(Boolean).join(' ')))
  );
