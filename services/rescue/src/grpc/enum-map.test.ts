import { describe, expect, it } from 'vitest';

import { RescueV1 } from '@adopt-dont-shop/proto';

import {
  ALL_RESCUE_STATUSES,
  ALL_VERIFICATION_SOURCES,
  statusFromDb,
  statusToDb,
  verificationSourceFromDb,
  verificationSourceToDb,
} from './enum-map.js';

describe('RescueStatus enum mapping', () => {
  it.each(ALL_RESCUE_STATUSES)('round-trips %s', db => {
    expect(statusToDb(statusFromDb(db))).toBe(db);
  });

  it('throws on the UNSPECIFIED sentinel and unknown DB value', () => {
    expect(() => statusToDb(RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED)).toThrowError();
    expect(() => statusFromDb('not_a_status')).toThrowError();
  });

  it('proto-populated count matches the DB variant count', () => {
    const populated = Object.values(RescueV1.RescueStatus).filter(
      v => typeof v === 'number' && v > 0
    );
    expect(populated).toHaveLength(ALL_RESCUE_STATUSES.length);
  });
});

describe('RescueVerificationSource mapping', () => {
  it.each(ALL_VERIFICATION_SOURCES)('round-trips %s', db => {
    expect(verificationSourceToDb(verificationSourceFromDb(db))).toBe(db);
  });

  it('returns null for the UNSPECIFIED sentinel — Verify treats it as "leave unchanged"', () => {
    expect(
      verificationSourceToDb(
        RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_UNSPECIFIED
      )
    ).toBeNull();
  });

  it('throws on an unknown DB value', () => {
    expect(() => verificationSourceFromDb('unknown')).toThrowError();
  });

  it('proto-populated count matches the DB variant count', () => {
    const populated = Object.values(RescueV1.RescueVerificationSource).filter(
      v => typeof v === 'number' && v > 0
    );
    expect(populated).toHaveLength(ALL_VERIFICATION_SOURCES.length);
  });
});
