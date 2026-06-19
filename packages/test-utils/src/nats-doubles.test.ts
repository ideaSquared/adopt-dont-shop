// Behaviour tests for the NATS test double.
//
// These tests prove that `makeNatsDouble`:
//   - Records `publish()` calls on the core NATS connection via a Vitest spy.
//   - Records `jetstream().publish()` calls (the primary path services use).
//   - Records both in the same `publishSpy` and `published` list so assertions
//     don't care which publish path the handler uses.
//   - `clearPublished()` resets both the spy and the plain-array record.
//   - `published` is ordered (FIFO) to match the sequence of calls.
//   - The spy is compatible with `.mockImplementation()` so tests that need
//     to interleave publish calls in an ordered-call log still work.

import { describe, expect, it, vi } from 'vitest';

import { makeNatsDouble } from './nats-doubles.js';

describe('makeNatsDouble — core publish', () => {
  it('records a plain publish call via the spy', () => {
    const nat = makeNatsDouble();
    nat.connection.publish('auth.userRegistered');

    expect(nat.publishSpy).toHaveBeenCalledTimes(1);
    expect(nat.publishSpy).toHaveBeenCalledWith('auth.userRegistered', undefined);
  });

  it('populates the plain-array published list', () => {
    const nat = makeNatsDouble();
    nat.connection.publish('auth.userRegistered');

    expect(nat.published).toHaveLength(1);
    expect(nat.published[0]?.subject).toBe('auth.userRegistered');
    expect(nat.published[0]?.data).toBeUndefined();
  });

  it('records the data payload when supplied', () => {
    const nat = makeNatsDouble();
    const payload = new TextEncoder().encode(JSON.stringify({ userId: 'u-1' }));

    nat.connection.publish('auth.userRegistered', payload);

    expect(nat.published[0]?.data).toEqual(payload);
    expect(nat.publishSpy.mock.calls[0]?.[1]).toEqual(payload);
  });

  it('records multiple publish calls in order', () => {
    const nat = makeNatsDouble();

    nat.connection.publish('auth.login');
    nat.connection.publish('auth.logout');
    nat.connection.publish('auth.passwordReset');

    expect(nat.publishSpy).toHaveBeenCalledTimes(3);
    expect(nat.published.map(c => c.subject)).toEqual([
      'auth.login',
      'auth.logout',
      'auth.passwordReset',
    ]);
  });

  it('supports mockImplementation for ordered-call-sequence tests', () => {
    const nat = makeNatsDouble();
    const log: string[] = [];

    // e.g. a test that tracks interleaved DB and NATS calls:
    nat.publishSpy.mockImplementation((subject: string) => {
      log.push(`NATS:${subject}`);
    });

    nat.connection.publish('auth.login');
    log.push('DB_COMMIT');
    nat.connection.publish('auth.logout');

    expect(log).toEqual(['NATS:auth.login', 'DB_COMMIT', 'NATS:auth.logout']);
  });
});

describe('makeNatsDouble — JetStream publish', () => {
  it('records a jetstream publish call via the spy', async () => {
    const nat = makeNatsDouble();
    await nat.connection.jetstream().publish('events.petAdopted');

    expect(nat.publishSpy).toHaveBeenCalledTimes(1);
    expect(nat.publishSpy).toHaveBeenCalledWith('events.petAdopted', undefined);
  });

  it('records jetstream publish in the plain-array list', async () => {
    const nat = makeNatsDouble();

    await nat.connection.jetstream().publish('events.petAdopted');

    expect(nat.published).toHaveLength(1);
    expect(nat.published[0]?.subject).toBe('events.petAdopted');
  });

  it('records jetstream publish with data payload', async () => {
    const nat = makeNatsDouble();
    const payload = new TextEncoder().encode('{"petId":"p-1"}');

    await nat.connection.jetstream().publish('events.petAdopted', payload);

    expect(nat.published[0]?.data).toEqual(payload);
  });

  it('returns a PubAck-like result so callers that await publish do not crash', async () => {
    const nat = makeNatsDouble();

    const result = await nat.connection.jetstream().publish('events.petAdopted');

    expect(result.seq).toBeGreaterThan(0);
    expect(result.stream).toBeDefined();
  });
});

describe('makeNatsDouble — spy mock.calls access', () => {
  it('exposes subject and data via mock.calls for existing test patterns', async () => {
    const nat = makeNatsDouble();
    const payload = new TextEncoder().encode('{"foo":"bar"}');

    nat.connection.publish('notifications.created', payload);

    const [subject, body] = nat.publishSpy.mock.calls[0] as [string, Uint8Array];
    expect(subject).toBe('notifications.created');
    expect(body).toEqual(payload);
  });
});

describe('makeNatsDouble — mixed publish paths', () => {
  it('records both core and JetStream publishes in the same spy and list', async () => {
    const nat = makeNatsDouble();

    nat.connection.publish('core.subject');
    await nat.connection.jetstream().publish('js.subject');

    expect(nat.publishSpy).toHaveBeenCalledTimes(2);
    expect(nat.published[0]?.subject).toBe('core.subject');
    expect(nat.published[1]?.subject).toBe('js.subject');
  });
});

describe('makeNatsDouble — clearPublished', () => {
  it('resets both the spy and the plain array', async () => {
    const nat = makeNatsDouble();

    nat.connection.publish('first');
    await nat.connection.jetstream().publish('second');
    expect(nat.publishSpy).toHaveBeenCalledTimes(2);
    expect(nat.published).toHaveLength(2);

    nat.clearPublished();

    expect(nat.publishSpy).toHaveBeenCalledTimes(0);
    expect(nat.published).toHaveLength(0);
  });

  it('records new calls after clearing', () => {
    const nat = makeNatsDouble();

    nat.connection.publish('old');
    nat.clearPublished();
    nat.connection.publish('new');

    expect(nat.publishSpy).toHaveBeenCalledTimes(1);
    expect(nat.published[0]?.subject).toBe('new');
  });
});

describe('makeNatsDouble — each call returns a fresh double', () => {
  it('separate doubles do not share spy state', () => {
    const natA = makeNatsDouble();
    const natB = makeNatsDouble();

    natA.connection.publish('a.subject');

    expect(natA.publishSpy).toHaveBeenCalledTimes(1);
    expect(natB.publishSpy).toHaveBeenCalledTimes(0);
    expect(natA.published).toHaveLength(1);
    expect(natB.published).toHaveLength(0);
  });
});

describe('makeNatsDouble — vi.fn compatibility', () => {
  it('publishSpy is a real Vitest spy that supports toHaveBeenCalledWith', () => {
    const nat = makeNatsDouble();
    const data = new Uint8Array([1, 2, 3]);

    nat.connection.publish('my.subject', data);

    // Vitest's toHaveBeenCalledWith matcher
    expect(nat.publishSpy).toHaveBeenCalledWith('my.subject', data);
  });

  it('publishSpy can be spied on with vi.spyOn-style mockResolvedValue', async () => {
    const nat = makeNatsDouble();
    // Override to simulate a throw
    nat.publishSpy.mockImplementationOnce(() => {
      throw new Error('NATS unavailable');
    });

    expect(() => nat.connection.publish('auth.login')).toThrow('NATS unavailable');
  });
});
