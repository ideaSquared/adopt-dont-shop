import { describe, expect, it } from 'vitest';

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import {
  ALL_APPLICATION_STATUSES,
  ALL_HOME_VISIT_OUTCOMES,
  homeVisitOutcomeFromDb,
  homeVisitOutcomeToDb,
  statusFromDb,
  statusToDb,
} from './enum-map.js';

function populatedCount(enumObj: Record<string, string | number>): number {
  return Object.values(enumObj).filter(v => typeof v === 'number' && v > 0).length;
}

describe('ApplicationStatus mapping', () => {
  it.each(ALL_APPLICATION_STATUSES)('round-trips %s', db => {
    expect(statusToDb(statusFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      statusToDb(ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNSPECIFIED)
    ).toThrowError();
    expect(() => statusFromDb('pending')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ApplicationsV1.ApplicationStatus)).toBe(ALL_APPLICATION_STATUSES.length);
  });
});

describe('HomeVisitOutcome mapping', () => {
  it.each(ALL_HOME_VISIT_OUTCOMES)('round-trips %s', db => {
    expect(homeVisitOutcomeToDb(homeVisitOutcomeFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      homeVisitOutcomeToDb(ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_UNSPECIFIED)
    ).toThrowError();
    expect(() => homeVisitOutcomeFromDb('cancelled')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ApplicationsV1.HomeVisitOutcome)).toBe(ALL_HOME_VISIT_OUTCOMES.length);
  });
});
