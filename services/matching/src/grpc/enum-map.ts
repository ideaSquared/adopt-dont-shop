// Mappers between the Postgres ENUM string values (matching.*) and the
// proto enum integers generated under MatchingV1. Same shape as
// services/moderation/src/grpc/enum-map.ts.
//
// Two enums: SwipeAction (4 values) + DeviceType (4 values).
//
// Convention:
//   - <enum>ToDb takes a proto value, returns the DB string OR throws
//     on UNSPECIFIED / UNRECOGNIZED (sentinel values are caller bugs)
//   - <enum>FromDb takes a DB string, returns the proto value OR
//     throws on unknown DB values (schema drift)
//   - ALL_<DB_ENUM> arrays exported for exhaustiveness tests

import { MatchingV1 } from '@adopt-dont-shop/proto';

// ===== SwipeAction ===================================================

export type SwipeActionDb = 'like' | 'pass' | 'super_like' | 'info';

const SWIPE_ACTION_TO_DB: Record<MatchingV1.SwipeAction, SwipeActionDb | null> = {
  [MatchingV1.SwipeAction.SWIPE_ACTION_UNSPECIFIED]: null,
  [MatchingV1.SwipeAction.SWIPE_ACTION_LIKE]: 'like',
  [MatchingV1.SwipeAction.SWIPE_ACTION_PASS]: 'pass',
  [MatchingV1.SwipeAction.SWIPE_ACTION_SUPER_LIKE]: 'super_like',
  [MatchingV1.SwipeAction.SWIPE_ACTION_INFO]: 'info',
  [MatchingV1.SwipeAction.UNRECOGNIZED]: null,
};

const DB_TO_SWIPE_ACTION: Record<SwipeActionDb, MatchingV1.SwipeAction> = {
  like: MatchingV1.SwipeAction.SWIPE_ACTION_LIKE,
  pass: MatchingV1.SwipeAction.SWIPE_ACTION_PASS,
  super_like: MatchingV1.SwipeAction.SWIPE_ACTION_SUPER_LIKE,
  info: MatchingV1.SwipeAction.SWIPE_ACTION_INFO,
};

export function swipeActionToDb(proto: MatchingV1.SwipeAction): SwipeActionDb {
  const db = SWIPE_ACTION_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid SwipeAction proto value: ${proto}`);
  }
  return db;
}

export function swipeActionFromDb(db: string): MatchingV1.SwipeAction {
  const proto = DB_TO_SWIPE_ACTION[db as SwipeActionDb];
  if (!proto) {
    throw new Error(`unknown swipe_action value: ${db}`);
  }
  return proto;
}

// ===== DeviceType ====================================================

export type DeviceTypeDb = 'desktop' | 'mobile' | 'tablet' | 'unknown';

const DEVICE_TYPE_TO_DB: Record<MatchingV1.DeviceType, DeviceTypeDb | null> = {
  [MatchingV1.DeviceType.DEVICE_TYPE_UNSPECIFIED]: null,
  [MatchingV1.DeviceType.DEVICE_TYPE_DESKTOP]: 'desktop',
  [MatchingV1.DeviceType.DEVICE_TYPE_MOBILE]: 'mobile',
  [MatchingV1.DeviceType.DEVICE_TYPE_TABLET]: 'tablet',
  [MatchingV1.DeviceType.DEVICE_TYPE_UNKNOWN]: 'unknown',
  [MatchingV1.DeviceType.UNRECOGNIZED]: null,
};

const DB_TO_DEVICE_TYPE: Record<DeviceTypeDb, MatchingV1.DeviceType> = {
  desktop: MatchingV1.DeviceType.DEVICE_TYPE_DESKTOP,
  mobile: MatchingV1.DeviceType.DEVICE_TYPE_MOBILE,
  tablet: MatchingV1.DeviceType.DEVICE_TYPE_TABLET,
  unknown: MatchingV1.DeviceType.DEVICE_TYPE_UNKNOWN,
};

export function deviceTypeToDb(proto: MatchingV1.DeviceType): DeviceTypeDb {
  const db = DEVICE_TYPE_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid DeviceType proto value: ${proto}`);
  }
  return db;
}

export function deviceTypeFromDb(db: string): MatchingV1.DeviceType {
  const proto = DB_TO_DEVICE_TYPE[db as DeviceTypeDb];
  if (!proto) {
    throw new Error(`unknown swipe_session_device_type value: ${db}`);
  }
  return proto;
}

// ===== Exhaustiveness arrays =========================================

export const ALL_SWIPE_ACTIONS: ReadonlyArray<SwipeActionDb> = [
  'like',
  'pass',
  'super_like',
  'info',
];

export const ALL_DEVICE_TYPES: ReadonlyArray<DeviceTypeDb> = [
  'desktop',
  'mobile',
  'tablet',
  'unknown',
];
