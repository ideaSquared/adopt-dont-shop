import { describe, expect, it } from 'vitest';

import {
  CreateUnlockRequestSchema,
  ERROR_HTTP_STATUS,
  InvokeRequestSchema,
  InvokeResponseSchema,
  isHiddenMarker,
  LoginPollResponseSchema,
  OpsErrorCodeSchema,
  TICKET_PATTERN,
} from './index.js';

const VALID_UUID = '0b6f2f8e-2a46-4b57-9a0e-1c3f5e7d9a10';

describe('unlock requests', () => {
  const base = { reason: 'Investigating failed adoption', ticket: 'ADS-1502' };

  it('accepts a user-scoped unlock', () => {
    const parsed = CreateUnlockRequestSchema.safeParse({
      ...base,
      subjectType: 'user',
      subjectId: VALID_UUID,
    });
    expect(parsed.success).toBe(true);
  });

  it("requires subjectId to be null for 'any'", () => {
    const parsed = CreateUnlockRequestSchema.safeParse({
      ...base,
      subjectType: 'any',
      subjectId: VALID_UUID,
    });
    expect(parsed.success).toBe(false);
  });

  it('requires a subjectId for a scoped unlock', () => {
    const parsed = CreateUnlockRequestSchema.safeParse({
      ...base,
      subjectType: 'rescue',
      subjectId: null,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a reason that is too short to be a justification', () => {
    const parsed = CreateUnlockRequestSchema.safeParse({
      ...base,
      reason: 'debug',
      subjectType: 'any',
      subjectId: null,
    });
    expect(parsed.success).toBe(false);
  });

  it('caps the unlock lifetime at 60 minutes', () => {
    const parsed = CreateUnlockRequestSchema.safeParse({
      ...base,
      subjectType: 'any',
      subjectId: null,
      ttlMinutes: 61,
    });
    expect(parsed.success).toBe(false);
  });

  it.each([
    ['ADS-1', true],
    ['OPS-42', true],
    ['ads-1', false],
    ['ADS', false],
    ['1502', false],
  ])('ticket %s valid=%s', (ticket, valid) => {
    expect(TICKET_PATTERN.test(ticket)).toBe(valid);
  });
});

describe('invoke requests', () => {
  it('defaults to preview mode, so a write never executes by accident', () => {
    const parsed = InvokeRequestSchema.parse({ rpc: 'pets.UpdateStatus', request: {} });
    expect(parsed.mode).toBe('preview');
  });

  it.each(['pets', 'Pets.Get', 'pets.get', 'pets.Get.Extra', 'pets.Get; drop'])(
    'rejects malformed rpc name %s',
    rpc => {
      expect(InvokeRequestSchema.safeParse({ rpc, request: {} }).success).toBe(false);
    }
  );
});

describe('invoke responses', () => {
  const common = {
    rpc: 'pets.UpdateStatus',
    env: 'staging',
    hidden: [],
    unlockable: null,
    revealedBy: null,
    durationMs: 12,
  };

  it('discriminates a plan from a result', () => {
    const plan = InvokeResponseSchema.parse({
      ...common,
      kind: 'plan',
      planId: VALID_UUID,
      expiresAt: '2026-11-08T12:00:00.000Z',
      dryRun: 'rollback',
      request: { petId: 'x' },
      response: null,
      warnings: [],
    });
    expect(plan.kind).toBe('plan');
  });

  it('rejects a plan without a planId', () => {
    const parsed = InvokeResponseSchema.safeParse({
      ...common,
      kind: 'plan',
      expiresAt: '2026-11-08T12:00:00.000Z',
      dryRun: 'rollback',
      request: {},
      response: null,
      warnings: [],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('login polling', () => {
  it('carries the session only on success', () => {
    const parsed = LoginPollResponseSchema.parse({
      status: 'ok',
      session: {
        token: 'x'.repeat(43),
        expiresAt: '2026-11-08T20:00:00.000Z',
        operator: { operatorId: VALID_UUID, login: 'octocat', name: null },
      },
    });
    expect(parsed.status).toBe('ok');
  });
});

describe('hidden marker', () => {
  it.each([
    [{ $hidden: true }, true],
    [{ $hidden: false }, false],
    [{ hidden: true }, false],
    [null, false],
    ['‹hidden›', false],
  ])('isHiddenMarker(%j) = %s', (value, expected) => {
    expect(isHiddenMarker(value)).toBe(expected);
  });
});

describe('error codes', () => {
  it('maps every error code to an HTTP status', () => {
    const unmapped = OpsErrorCodeSchema.options.filter(code => !(code in ERROR_HTTP_STATUS));
    expect(unmapped).toEqual([]);
  });
});
