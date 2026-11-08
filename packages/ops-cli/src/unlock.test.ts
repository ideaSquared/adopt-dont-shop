import { describe, expect, it } from 'vitest';
import { stripAnsi } from './ui/theme.js';
import { UsageError } from './errors.js';
import { apiError, json, makeCtx, sampleSession } from './test-support.js';
import { createClient } from './client.js';
import {
  activeUnlocks,
  createUnlockFlow,
  describeSubject,
  hiddenOfferText,
  lookupOfferText,
  piiFieldsSet,
  promptSubject,
  renderUnlockCreated,
  shouldOfferUnlockBefore,
  validateReason,
  validateTicket,
  validateTtl,
} from './unlock.js';

const NOW = Date.parse('2026-10-12T14:00:00Z');
const unlock = (expiresAt: string) => ({
  unlockId: '33333333-3333-4333-8333-333333333333',
  subjectType: 'any' as const,
  subjectId: null,
  reason: 'investigating a ticket',
  ticket: 'ADS-1',
  createdAt: '2026-10-12T13:00:00.000Z',
  expiresAt,
});
const method = { piiRequestFields: ['owner_email'] };

describe('offering an unlock before calling', () => {
  it('offers when a PII request field is set and nothing is unlocked', () => {
    expect(
      shouldOfferUnlockBefore({
        method,
        request: { ownerEmail: 'a@b.c' },
        unlocks: [],
        nowMs: NOW,
        interactive: true,
      })
    ).toEqual(['owner_email']);
  });

  it('matches snake_case and camelCase field names alike', () => {
    expect(piiFieldsSet(method, { owner_email: 'x' })).toEqual(['owner_email']);
    expect(piiFieldsSet(method, { ownerEmail: 'x' })).toEqual(['owner_email']);
  });

  it('does not offer for empty values or other fields', () => {
    expect(piiFieldsSet(method, { ownerEmail: '' })).toEqual([]);
    expect(piiFieldsSet(method, { ownerEmail: [] })).toEqual([]);
    expect(piiFieldsSet(method, { name: 'x' })).toEqual([]);
  });

  it('does not offer when an unlock is already active', () => {
    expect(
      shouldOfferUnlockBefore({
        method,
        request: { ownerEmail: 'a' },
        unlocks: [unlock('2026-10-12T14:30:00Z')],
        nowMs: NOW,
        interactive: true,
      })
    ).toEqual([]);
  });

  it('offers again once the unlock has expired', () => {
    const expired = [unlock('2026-10-12T13:30:00Z')];
    expect(activeUnlocks(expired, NOW)).toEqual([]);
    expect(
      shouldOfferUnlockBefore({
        method,
        request: { ownerEmail: 'a' },
        unlocks: expired,
        nowMs: NOW,
        interactive: true,
      })
    ).toEqual(['owner_email']);
  });

  it('never offers without a terminal', () => {
    expect(
      shouldOfferUnlockBefore({
        method,
        request: { ownerEmail: 'a' },
        unlocks: [],
        nowMs: NOW,
        interactive: false,
      })
    ).toEqual([]);
  });
});

describe('offer wording', () => {
  it('says how many fields are hidden and what an unlock needs', () => {
    expect(hiddenOfferText(3, { subjectType: 'user', subjectId: 'u-1' })).toBe(
      '3 fields hidden. Unlock user u-1? Needs a reason + ticket and alerts #ops.'
    );
    expect(hiddenOfferText(1, { subjectType: 'any', subjectId: null })).toContain(
      '1 field hidden. Unlock everything?'
    );
    expect(describeSubject({ subjectType: 'rescue', subjectId: 'r-9' })).toBe('rescue r-9');
    expect(lookupOfferText(['email'])).toContain('Looking up by email');
  });
});

describe('unlock input validation', () => {
  it('needs a reason of at least 10 characters', () => {
    expect(validateReason('short')).toBeDefined();
    expect(validateReason('long enough reason')).toBeUndefined();
  });

  it('needs a ticket like ADS-123', () => {
    expect(validateTicket('ADS-123')).toBeUndefined();
    expect(validateTicket('ads-123')).toBeDefined();
    expect(validateTicket('123')).toBeDefined();
  });

  it('needs whole minutes up to 60', () => {
    expect(validateTtl('30')).toBeUndefined();
    expect(validateTtl('0')).toBeDefined();
    expect(validateTtl('61')).toBeDefined();
    expect(validateTtl('1.5')).toBeDefined();
  });
});

describe('creating an unlock', () => {
  const created = (ctx: Awaited<ReturnType<typeof makeCtx>>) => {
    ctx.requests.length = 0;
    return createClient({
      fetch: ctx.fetch,
      baseUrl: 'http://x',
      env: 'dev',
      token: sampleSession().token,
    });
  };
  const route = (body: unknown) =>
    json({ unlock: { ...unlock('2026-10-12T14:30:00.000Z'), ...(body as object) } });

  it('prompts for what is missing in a terminal and defaults the TTL to 30', async () => {
    const ctx = await makeCtx({
      tty: true,
      answers: { text: ['looking into a failed email', 'ADS-77', '30'] },
      routes: ({ body }) => route(body),
    });
    await createUnlockFlow(
      ctx,
      'dev',
      created(ctx),
      { subject: { subjectType: 'user', subjectId: 'u-1' } },
      true
    );
    expect(ctx.requests[0]?.body).toEqual({
      subjectType: 'user',
      subjectId: 'u-1',
      reason: 'looking into a failed email',
      ticket: 'ADS-77',
      ttlMinutes: 30,
    });
  });

  it('takes everything from flags without a terminal, with 30 minutes by default', async () => {
    const ctx = await makeCtx({ routes: ({ body }) => route(body) });
    await createUnlockFlow(
      ctx,
      'dev',
      created(ctx),
      {
        subject: { subjectType: 'any', subjectId: null },
        reason: 'supporting a customer',
        ticket: 'ADS-5',
      },
      false
    );
    expect(ctx.requests[0]?.body).toMatchObject({
      subjectType: 'any',
      subjectId: null,
      ttlMinutes: 30,
    });
  });

  it('is a usage error to leave things out without a terminal', async () => {
    const ctx = await makeCtx({ routes: ({ body }) => route(body) });
    await expect(
      createUnlockFlow(
        ctx,
        'dev',
        created(ctx),
        { subject: { subjectType: 'any', subjectId: null } },
        false
      )
    ).rejects.toBeInstanceOf(UsageError);
  });

  it('rejects an invalid flag value', async () => {
    const ctx = await makeCtx({ routes: ({ body }) => route(body) });
    await expect(
      createUnlockFlow(
        ctx,
        'dev',
        created(ctx),
        { subject: { subjectType: 'any', subjectId: null }, reason: 'short', ticket: 'ADS-5' },
        false
      )
    ).rejects.toThrow(/--reason/);
  });

  it('shows the red banner in prod and surfaces UNLOCKS_DISABLED', async () => {
    const ctx = await makeCtx({
      routes: () => apiError(503, 'UNLOCKS_DISABLED', 'alerting is not configured'),
    });
    await expect(
      createUnlockFlow(
        ctx,
        'prod',
        created(ctx),
        {
          subject: { subjectType: 'any', subjectId: null },
          reason: 'supporting a customer',
          ticket: 'ADS-5',
        },
        false
      )
    ).rejects.toMatchObject({ code: 'UNLOCKS_DISABLED' });
    expect(ctx.stderr()).toContain('PRODUCTION');
  });

  it('asks which subject when the server could not say', async () => {
    const one = await makeCtx({ answers: { select: ['user'], text: ['u-42'] } });
    expect(await promptSubject(one)).toEqual({ subjectType: 'user', subjectId: 'u-42' });
    const any = await makeCtx({ answers: { select: ['any'] } });
    expect(await promptSubject(any)).toEqual({ subjectType: 'any', subjectId: null });
  });
});

describe('unlock confirmation copy', () => {
  const unlock = {
    unlockId: '0b6f2f8e-2a46-4b57-9a0e-1c3f5e7d9a10',
    subjectType: 'any' as const,
    subjectId: null,
    reason: 'Investigating failed adoption',
    ticket: 'ADS-1502',
    createdAt: '2026-11-08T12:00:00.000Z',
    expiresAt: '2026-11-08T12:30:00.000Z',
  };

  it.each([
    ['dev', 'Recorded in the audit log'],
    ['staging', '#ops has been alerted'],
    ['prod', '#ops has been alerted'],
  ] as const)('only claims an #ops alert where one is sent (%s)', async (env, expected) => {
    const ctx = await makeCtx({});
    const text = stripAnsi(renderUnlockCreated(ctx, env, unlock).join('\n'));
    expect(text).toContain(expected);
  });
});
