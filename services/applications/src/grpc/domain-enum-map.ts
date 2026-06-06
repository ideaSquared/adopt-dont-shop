// Domain-status → proto enum mappers.
//
// The pure domain's ApplicationStatus + HomeVisitOutcome string unions
// happen to use the exact same string values as the Postgres ENUMs
// (both are 'draft' | 'submitted' | ... and 'passed' | 'failed' |
// 'reschedule'). So the state→proto mapper can reuse the DB→proto
// enum-map functions from #909 — these thin aliases just give them
// domain-flavoured names so the call sites read clearly.

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import type { ApplicationStatus, HomeVisitOutcome } from '../domain/index.js';

import { homeVisitOutcomeFromDb, statusFromDb } from './enum-map.js';

export function statusToProto(status: ApplicationStatus): ApplicationsV1.ApplicationStatus {
  return statusFromDb(status);
}

export function homeVisitOutcomeToProto(
  outcome: HomeVisitOutcome
): ApplicationsV1.HomeVisitOutcome {
  return homeVisitOutcomeFromDb(outcome);
}
