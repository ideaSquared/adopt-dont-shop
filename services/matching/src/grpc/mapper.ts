// Row → proto mappers for SwipeSession + SwipeActionRecord.
//
// DB row shapes mirror matching.swipe_sessions + matching.swipe_actions
// from #888. Proto messages are SwipeSession + SwipeActionRecord from
// #891. Pure functions — no I/O.
//
// JSONB filters column stringifies via JSON.stringify; null normalises
// to '{}' so the SPA never sees the JSON null literal (blob trick —
// same as pets extra_json / rescue settings_json).

import type { SwipeActionRecord, SwipeSession } from '@adopt-dont-shop/proto';

import { deviceTypeFromDb, swipeActionFromDb } from './enum-map.js';

// --- SwipeSession row → proto ----------------------------------------

export type SwipeSessionRow = {
  session_id: string;
  user_id: string | null;
  start_time: Date;
  end_time: Date | null;
  total_swipes: number;
  likes: number;
  passes: number;
  super_likes: number;
  filters: unknown;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export function sessionRowToProto(row: SwipeSessionRow): SwipeSession {
  const session: SwipeSession = {
    sessionId: row.session_id,
    startTime: row.start_time.toISOString(),
    totalSwipes: row.total_swipes,
    likes: row.likes,
    passes: row.passes,
    superLikes: row.super_likes,
    filtersJson: JSON.stringify(row.filters ?? {}),
    // device_type column defaults to 'unknown' but is nullable in
    // schema; fall back to DEVICE_TYPE_UNKNOWN if NULL.
    deviceType:
      row.device_type === null ? deviceTypeFromDb('unknown') : deviceTypeFromDb(row.device_type),
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  if (row.user_id !== null) {
    session.userId = row.user_id;
  }
  if (row.end_time !== null) {
    session.endTime = row.end_time.toISOString();
  }
  if (row.ip_address !== null) {
    session.ipAddress = row.ip_address;
  }
  if (row.user_agent !== null) {
    session.userAgent = row.user_agent;
  }

  return session;
}

// --- SwipeActionRecord row → proto -----------------------------------

export type SwipeActionRow = {
  swipe_action_id: string;
  session_id: string;
  pet_id: string;
  user_id: string | null;
  action: string;
  timestamp: Date;
  response_time: number | null;
  device_type: string | null;
};

export function actionRowToProto(row: SwipeActionRow): SwipeActionRecord {
  const action: SwipeActionRecord = {
    swipeActionId: row.swipe_action_id,
    sessionId: row.session_id,
    petId: row.pet_id,
    action: swipeActionFromDb(row.action),
    timestamp: row.timestamp.toISOString(),
  };

  if (row.user_id !== null) {
    action.userId = row.user_id;
  }
  if (row.response_time !== null) {
    action.responseTime = row.response_time;
  }
  if (row.device_type !== null) {
    action.deviceType = row.device_type;
  }

  return action;
}
