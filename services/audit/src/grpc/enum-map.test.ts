import { describe, expect, it } from 'vitest';

import { AuditV1 } from '@adopt-dont-shop/proto';

import { ALL_OUTCOMES, outcomeFromDb, outcomeToDb } from './enum-map.js';

// Bite #10: ts-proto adds UNRECOGNIZED = -1; UNSPECIFIED = 0 is the
// proto3 sentinel. Filter both with `v > 0`.
function populatedCount(enumObj: Record<string, string | number>): number {
  return Object.values(enumObj).filter(v => typeof v === 'number' && v > 0).length;
}

describe('AuditOutcome mapping', () => {
  it.each(ALL_OUTCOMES)('round-trips %s', db => {
    expect(outcomeToDb(outcomeFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() => outcomeToDb(AuditV1.AuditOutcome.AUDIT_OUTCOME_UNSPECIFIED)).toThrowError();
    expect(() => outcomeFromDb('partial')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(AuditV1.AuditOutcome)).toBe(ALL_OUTCOMES.length);
  });

  it('denied + failure are distinct (denied = authz block, failure = exception)', () => {
    // Lesson from the audit proto comment: a DENIED row is forensically
    // valuable because it captures the attempt; FAILURE is for server
    // errors. Mapping must not collapse them.
    expect(outcomeToDb(AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED)).toBe('denied');
    expect(outcomeToDb(AuditV1.AuditOutcome.AUDIT_OUTCOME_FAILURE)).toBe('failure');
    expect(outcomeToDb(AuditV1.AuditOutcome.AUDIT_OUTCOME_DENIED)).not.toBe(
      outcomeToDb(AuditV1.AuditOutcome.AUDIT_OUTCOME_FAILURE)
    );
  });
});
