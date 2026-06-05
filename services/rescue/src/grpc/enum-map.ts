// Mappers between the Postgres ENUM string values (`rescue_status`,
// `rescue_verification_source`) and the proto enum integers generated
// under `RescueV1`. Same shape as services/pets/src/grpc/enum-map.ts.

import { RescueV1 } from '@adopt-dont-shop/proto';

export type RescueStatusDb = 'pending' | 'verified' | 'suspended' | 'inactive' | 'rejected';

export type RescueVerificationSourceDb = 'companies_house' | 'charity_commission' | 'manual';

// --- status ----------------------------------------------------------

const STATUS_TO_DB: Record<RescueV1.RescueStatus, RescueStatusDb | null> = {
  [RescueV1.RescueStatus.RESCUE_STATUS_UNSPECIFIED]: null,
  [RescueV1.RescueStatus.RESCUE_STATUS_PENDING]: 'pending',
  [RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED]: 'verified',
  [RescueV1.RescueStatus.RESCUE_STATUS_SUSPENDED]: 'suspended',
  [RescueV1.RescueStatus.RESCUE_STATUS_INACTIVE]: 'inactive',
  [RescueV1.RescueStatus.RESCUE_STATUS_REJECTED]: 'rejected',
  [RescueV1.RescueStatus.UNRECOGNIZED]: null,
};

const DB_TO_STATUS: Record<RescueStatusDb, RescueV1.RescueStatus> = {
  pending: RescueV1.RescueStatus.RESCUE_STATUS_PENDING,
  verified: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
  suspended: RescueV1.RescueStatus.RESCUE_STATUS_SUSPENDED,
  inactive: RescueV1.RescueStatus.RESCUE_STATUS_INACTIVE,
  rejected: RescueV1.RescueStatus.RESCUE_STATUS_REJECTED,
};

export function statusToDb(proto: RescueV1.RescueStatus): RescueStatusDb {
  const db = STATUS_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid RescueStatus proto value: ${proto}`);
  }
  return db;
}

export function statusFromDb(db: string): RescueV1.RescueStatus {
  const proto = DB_TO_STATUS[db as RescueStatusDb];
  if (!proto) {
    throw new Error(`unknown rescue_status value: ${db}`);
  }
  return proto;
}

// --- verification source ---------------------------------------------

const SOURCE_TO_DB: Record<RescueV1.RescueVerificationSource, RescueVerificationSourceDb | null> = {
  [RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_UNSPECIFIED]: null,
  [RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_COMPANIES_HOUSE]: 'companies_house',
  [RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_CHARITY_COMMISSION]:
    'charity_commission',
  [RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_MANUAL]: 'manual',
  [RescueV1.RescueVerificationSource.UNRECOGNIZED]: null,
};

const DB_TO_SOURCE: Record<RescueVerificationSourceDb, RescueV1.RescueVerificationSource> = {
  companies_house: RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_COMPANIES_HOUSE,
  charity_commission:
    RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_CHARITY_COMMISSION,
  manual: RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_MANUAL,
};

export function verificationSourceToDb(
  proto: RescueV1.RescueVerificationSource
): RescueVerificationSourceDb | null {
  return SOURCE_TO_DB[proto];
}

export function verificationSourceFromDb(db: string): RescueV1.RescueVerificationSource {
  const proto = DB_TO_SOURCE[db as RescueVerificationSourceDb];
  if (!proto) {
    throw new Error(`unknown rescue_verification_source value: ${db}`);
  }
  return proto;
}

// Exported for exhaustiveness tests.
export const ALL_RESCUE_STATUSES: ReadonlyArray<RescueStatusDb> = [
  'pending',
  'verified',
  'suspended',
  'inactive',
  'rejected',
];

export const ALL_VERIFICATION_SOURCES: ReadonlyArray<RescueVerificationSourceDb> = [
  'companies_house',
  'charity_commission',
  'manual',
];
