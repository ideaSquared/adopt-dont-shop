// pets.updated subscriber — keeps the denormalised pet_type / pet_breed on
// the applications read model (migration 016) current when a pet changes.
//
// Event-carried state transfer: service.pets puts the pet's current type,
// breed and version on the event, so this never calls back into pets. Only
// an event newer than the stored pet_version is applied: a JetStream
// redelivery of an older edit can't overwrite a newer one, and reapplying
// the same event is a no-op. Events from a pets service that predates those
// payload fields carry no `type` / `version` and are ignored.

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';

import { subscribe, type SubscriptionHandle } from '@adopt-dont-shop/events';

const DURABLE = 'applications-pets-updated';

type PetUpdate = { petId: string; type: string; breed: string | null; version: number };

function parsePetUpdate(payload: unknown): PetUpdate | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  // Narrowed to a non-null object above; each field is still checked individually.
  const { petId, type, breed, version } = payload as Record<string, unknown>;
  if (typeof petId !== 'string' || petId === '' || typeof type !== 'string' || type === '') {
    return null;
  }
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return null;
  }
  return { petId, type, breed: typeof breed === 'string' && breed !== '' ? breed : null, version };
}

export async function applyPetUpdate(pool: Pick<Pool, 'query'>, payload: unknown): Promise<void> {
  const update = parsePetUpdate(payload);
  if (update === null) {
    return;
  }
  await pool.query(
    `UPDATE applications SET pet_type = $1, pet_breed = $2, pet_version = $4
      WHERE pet_id = $3 AND deleted_at IS NULL
        AND (pet_version IS NULL OR pet_version < $4)`,
    [update.type, update.breed, update.petId, update.version]
  );
}

export function registerPetUpdatesSubscriber(opts: {
  nats: NatsConnection;
  pool: Pool;
  onError: (err: unknown, subject: string) => void;
}): SubscriptionHandle {
  return subscribe<unknown>(
    opts.nats,
    {
      subject: 'pets.updated',
      durable: DURABLE,
      onError: (err, ctx) => opts.onError(err, ctx.subject),
    },
    payload => applyPetUpdate(opts.pool, payload)
  );
}
