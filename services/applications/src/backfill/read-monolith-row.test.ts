import { describe, expect, it } from 'vitest';

import { isKnownStatus, rowToInput, type MonolithApplicationRow } from './read-monolith-row.js';

const row = (overrides: Partial<MonolithApplicationRow> = {}): MonolithApplicationRow => ({
  application_id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  pet_id: '33333333-3333-3333-3333-333333333333',
  rescue_id: '44444444-4444-4444-4444-444444444444',
  status: 'submitted',
  created_at: new Date('2026-01-01T10:00:00.000Z'),
  submitted_at: new Date('2026-01-02T10:00:00.000Z'),
  reviewed_at: null,
  decision_at: null,
  actioned_by: null,
  rejection_reason: null,
  withdrawal_reason: null,
  answers: null,
  references: null,
  ...overrides,
});

describe('isKnownStatus', () => {
  it.each(['submitted', 'approved', 'rejected', 'withdrawn'])('accepts %s', status => {
    expect(isKnownStatus(status)).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(isKnownStatus('under_review')).toBe(false);
    expect(isKnownStatus('')).toBe(false);
  });
});

describe('rowToInput', () => {
  it('normalises Date timestamps to ISO-8601 strings', () => {
    const input = rowToInput(row());
    expect(input.createdAt).toBe('2026-01-01T10:00:00.000Z');
    expect(input.submittedAt).toBe('2026-01-02T10:00:00.000Z');
    expect(input.reviewedAt).toBeNull();
    expect(input.decidedAt).toBeNull();
  });

  it('defaults null answers to an empty object', () => {
    expect(rowToInput(row({ answers: null })).answers).toEqual({});
  });

  it('passes a populated answers map through', () => {
    expect(rowToInput(row({ answers: { hasYard: true } })).answers).toEqual({ hasYard: true });
  });

  it('maps reference rows, defaulting a null email to empty string', () => {
    const input = rowToInput(
      row({
        references: [
          { name: 'Vet Bob', email: null, relationship: 'vet' },
          { name: 'Jane', email: 'jane@example.com', relationship: 'friend' },
        ],
      })
    );
    expect(input.references).toEqual([
      { name: 'Vet Bob', email: '', relationship: 'vet' },
      { name: 'Jane', email: 'jane@example.com', relationship: 'friend' },
    ]);
  });

  it('throws on an unmappable status, naming the application id', () => {
    expect(() => rowToInput(row({ status: 'archived' }))).toThrow(
      /application 11111111-1111-1111-1111-111111111111 has unmappable status 'archived'/
    );
  });
});
