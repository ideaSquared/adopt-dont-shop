// Mappers between the Postgres ENUM string values (applications.*)
// and the proto enum integers generated under ApplicationsV1. Same
// shape as services/rescue, services/pets, services/audit enum-maps.
//
// Two enums: ApplicationStatus (9 values mirroring the Phase 5.2
// lifecycle) and HomeVisitOutcome (3 values matching the home-visit
// state machine in #890).

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

// ===== ApplicationStatus =============================================

export type ApplicationStatusDb =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'home_visit_scheduled'
  | 'home_visit_completed'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'adopted';

const STATUS_TO_DB: Record<ApplicationsV1.ApplicationStatus, ApplicationStatusDb | null> = {
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNSPECIFIED]: null,
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_DRAFT]: 'draft',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED]: 'submitted',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNDER_REVIEW]: 'under_review',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_HOME_VISIT_SCHEDULED]:
    'home_visit_scheduled',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_HOME_VISIT_COMPLETED]:
    'home_visit_completed',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_APPROVED]: 'approved',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_REJECTED]: 'rejected',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_WITHDRAWN]: 'withdrawn',
  [ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_ADOPTED]: 'adopted',
  [ApplicationsV1.ApplicationStatus.UNRECOGNIZED]: null,
};

const DB_TO_STATUS: Record<ApplicationStatusDb, ApplicationsV1.ApplicationStatus> = {
  draft: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_DRAFT,
  submitted: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
  under_review: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNDER_REVIEW,
  home_visit_scheduled: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_HOME_VISIT_SCHEDULED,
  home_visit_completed: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_HOME_VISIT_COMPLETED,
  approved: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_APPROVED,
  rejected: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_REJECTED,
  withdrawn: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_WITHDRAWN,
  adopted: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_ADOPTED,
};

export function statusToDb(proto: ApplicationsV1.ApplicationStatus): ApplicationStatusDb {
  const db = STATUS_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid ApplicationStatus proto value: ${proto}`);
  }
  return db;
}

export function statusFromDb(db: string): ApplicationsV1.ApplicationStatus {
  const proto = DB_TO_STATUS[db as ApplicationStatusDb];
  if (!proto) {
    throw new Error(`unknown application_status value: ${db}`);
  }
  return proto;
}

// ===== HomeVisitOutcome ==============================================

export type HomeVisitOutcomeDb = 'passed' | 'failed' | 'reschedule';

const OUTCOME_TO_DB: Record<ApplicationsV1.HomeVisitOutcome, HomeVisitOutcomeDb | null> = {
  [ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_UNSPECIFIED]: null,
  [ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_PASSED]: 'passed',
  [ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_FAILED]: 'failed',
  [ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_RESCHEDULE]: 'reschedule',
  [ApplicationsV1.HomeVisitOutcome.UNRECOGNIZED]: null,
};

const DB_TO_OUTCOME: Record<HomeVisitOutcomeDb, ApplicationsV1.HomeVisitOutcome> = {
  passed: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_PASSED,
  failed: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_FAILED,
  reschedule: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_RESCHEDULE,
};

export function homeVisitOutcomeToDb(proto: ApplicationsV1.HomeVisitOutcome): HomeVisitOutcomeDb {
  const db = OUTCOME_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid HomeVisitOutcome proto value: ${proto}`);
  }
  return db;
}

export function homeVisitOutcomeFromDb(db: string): ApplicationsV1.HomeVisitOutcome {
  const proto = DB_TO_OUTCOME[db as HomeVisitOutcomeDb];
  if (!proto) {
    throw new Error(`unknown home_visit_outcome value: ${db}`);
  }
  return proto;
}

// ===== Exhaustiveness arrays =========================================

export const ALL_APPLICATION_STATUSES: ReadonlyArray<ApplicationStatusDb> = [
  'draft',
  'submitted',
  'under_review',
  'home_visit_scheduled',
  'home_visit_completed',
  'approved',
  'rejected',
  'withdrawn',
  'adopted',
];

export const ALL_HOME_VISIT_OUTCOMES: ReadonlyArray<HomeVisitOutcomeDb> = [
  'passed',
  'failed',
  'reschedule',
];
