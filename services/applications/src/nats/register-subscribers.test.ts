import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

const subscribeMock = vi.hoisted(() => vi.fn());

vi.mock('@adopt-dont-shop/events', () => ({ subscribe: subscribeMock }));

import { registerApplicantUpdatesSubscriber } from './applicant-updates.js';
import { registerPetUpdatesSubscriber } from './pet-updates.js';

type Registered = {
  opts: { subject: string; durable: string; onError: (err: unknown, ctx: unknown) => void };
  handler: (payload: unknown) => Promise<void>;
};

const lastRegistration = (): Registered => {
  const [, opts, handler] = subscribeMock.mock.calls.at(-1) as [
    unknown,
    Registered['opts'],
    Registered['handler'],
  ];
  return { opts, handler };
};

const makeDeps = () => {
  const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });
  return {
    nats: {} as NatsConnection,
    pool: { query } as unknown as Pool,
    query,
    onError: vi.fn(),
  };
};

describe('subscriber registration', () => {
  it('subscribes to pets.updated on its own durable and applies each event', async () => {
    const deps = makeDeps();
    registerPetUpdatesSubscriber(deps);

    const { opts, handler } = lastRegistration();
    expect(opts).toMatchObject({ subject: 'pets.updated', durable: 'applications-pets-updated' });

    await handler({ petId: 'pet-1', type: 'dog', breed: null, version: 2 });
    expect(deps.query).toHaveBeenCalledWith(expect.stringContaining('pet_type'), [
      'dog',
      null,
      'pet-1',
      2,
    ]);

    opts.onError(new Error('boom'), { subject: 'pets.updated', raw: '{}' });
    expect(deps.onError).toHaveBeenCalledWith(expect.any(Error), 'pets.updated');
  });

  it('subscribes to auth.userProfileChanged on its own durable and applies each event', async () => {
    const deps = makeDeps();
    registerApplicantUpdatesSubscriber(deps);

    const { opts, handler } = lastRegistration();
    expect(opts).toMatchObject({
      subject: 'auth.userProfileChanged',
      durable: 'applications-auth-user-profile-changed',
    });

    await handler({
      userId: 'usr-1',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      updatedAt: '2026-03-01T10:00:00.000Z',
    });
    expect(deps.query).toHaveBeenCalledWith(expect.stringContaining('applicant_name'), [
      'Jane Smith',
      'jane@example.com',
      '2026-03-01T10:00:00.000Z',
      'usr-1',
    ]);

    opts.onError(new Error('boom'), { subject: 'auth.userProfileChanged', raw: '{}' });
    expect(deps.onError).toHaveBeenCalledWith(expect.any(Error), 'auth.userProfileChanged');
  });
});
