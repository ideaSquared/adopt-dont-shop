// ---------------------------------------------------------------------------
// Shared audit-log → activity formatting helpers
// ---------------------------------------------------------------------------
//
// The admin EntityInspector renders an Activity tab on every entity type
// (users, rescues, pets, applications, ...). All of those tabs need the
// same translation from raw audit_log rows to the EntityActivity wire
// shape — so the action→verb mapping, description composition, and
// metadata label extraction live here rather than being duplicated per
// entity service.

import type { EntityActivity, EntityActivityType } from '@adopt-dont-shop/lib.types';
import type { JsonObject } from '../types/common';
import type { AuditLog } from '../models/AuditLog';

/** Map an UPPER_SNAKE audit action to a coarse activity type bucket. */
export const mapActionToActivityType = (action: string): EntityActivityType => {
  if (action.includes('APPLICATION')) {
    return 'application';
  }
  if (action.includes('CHAT') || action.includes('MESSAGE')) {
    return 'chat';
  }
  if (action.includes('FAVORITE')) {
    return 'favorite';
  }
  if (action.includes('PROFILE') || action.includes('USER_UPDATE')) {
    return 'profile_update';
  }
  if (action.includes('LOGIN')) {
    return 'login';
  }
  return 'other';
};

/**
 * Pull a display-friendly entity label out of metadata. Audit writers
 * stash human-readable context under metadata.details (petName, title,
 * name, email, ...); fall back to metadata.entityId so something
 * recognisable surfaces even when the writer didn't include a name.
 */
export const extractEntityLabel = (metadata?: JsonObject | null): string | undefined => {
  if (!metadata) {
    return undefined;
  }
  const details =
    typeof metadata.details === 'object' && metadata.details !== null
      ? (metadata.details as JsonObject)
      : undefined;
  const candidateKeys = ['petName', 'title', 'name', 'rescueName', 'subject', 'email'];
  for (const key of candidateKeys) {
    const fromDetails = details?.[key];
    if (typeof fromDetails === 'string' && fromDetails.length > 0) {
      return fromDetails;
    }
    const fromMetadata = metadata[key];
    if (typeof fromMetadata === 'string' && fromMetadata.length > 0) {
      return fromMetadata;
    }
  }
  const entityId = metadata.entityId;
  if (typeof entityId === 'string' && entityId.length > 0) {
    return entityId;
  }
  return undefined;
};

/** Convert an UPPER_SNAKE action name to a past-tense verb phrase. */
export const actionToVerb = (action: string): string => {
  const verbMap: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    VIEW: 'Viewed',
    UPDATE_STATUS: 'Updated status of',
    ADD_IMAGES: 'Added images to',
    UPDATE_IMAGES: 'Updated images on',
    REMOVE_IMAGE: 'Removed image from',
    BULK_OPERATION: 'Performed bulk operation on',
    BULK_UPDATE: 'Bulk-updated',
    SUSPEND: 'Suspended',
    UNSUSPEND: 'Unsuspended',
    DEACTIVATE: 'Deactivated',
    REACTIVATE: 'Reactivated',
  };
  if (verbMap[action]) {
    return verbMap[action];
  }
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, c => c.toUpperCase());
};

/**
 * Format activity description from action, entity category, and metadata.
 *
 * Audit rows are emitted as (action, category, metadata) where category is
 * the entity name (PET, APPLICATION, USER, ...) and metadata.details holds
 * arbitrary context — often a human-readable name. We compose all three so
 * bare verbs like CREATE/UPDATE/DELETE surface their entity instead of
 * appearing as a one-word "create" / "update" in the UI.
 */
export const formatActivityDescription = (
  action: string,
  category: string,
  metadata?: JsonObject | null
): string => {
  const knownPhrasings: Record<string, (entity: string | undefined) => string> = {
    APPLICATION_SUBMITTED: entity => `Submitted application for ${entity ?? 'a pet'}`,
    APPLICATION_UPDATED: entity => `Updated application${entity ? ` for ${entity}` : ''}`,
    APPLICATION_STATUS_UPDATED: entity =>
      `Application status changed${entity ? ` for ${entity}` : ''}`,
    WITHDRAW: () => 'Withdrew application',
    USER_LOGIN: () => 'Logged into account',
    LOGIN: () => 'Logged in',
    LOGOUT: () => 'Logged out',
    LOGIN_FAILED: () => 'Failed login attempt',
    PROFILE_UPDATED: () => 'Updated profile',
    USER_CREATED: () => 'Account created',
    PASSWORD_RESET: () => 'Password reset',
    PASSWORD_RESET_REQUEST: () => 'Requested password reset',
    EMAIL_VERIFICATION: () => 'Verified email address',
    PET_FAVORITED: entity => `Added ${entity ?? 'a pet'} to favorites`,
    MESSAGE_SENT: () => 'Sent a message',
    MESSAGE_READ: () => 'Read a message',
    CHAT_CREATED: () => 'Started a new conversation',
    FILE_UPLOAD: entity => `Uploaded ${entity ?? 'a file'}`,
    FILE_DELETE: entity => `Deleted ${entity ?? 'a file'}`,
    VIEW: entity => `Viewed ${entity ?? category.toLowerCase()}`,
    TWO_FACTOR_ENABLED: () => 'Enabled two-factor authentication',
    TWO_FACTOR_DISABLED: () => 'Disabled two-factor authentication',
  };

  const entityLabel = extractEntityLabel(metadata);
  const phrasing = knownPhrasings[action];
  if (phrasing) {
    return phrasing(entityLabel);
  }

  const verb = actionToVerb(action);
  const entityName = category ? category.toLowerCase().replace(/_/g, ' ') : '';
  const base = entityName ? `${verb} ${entityName}` : verb;
  return entityLabel ? `${base}: ${entityLabel}` : base;
};

/** Map a raw AuditLog row to the shared EntityActivity wire shape. */
export const auditLogToActivity = (row: AuditLog): EntityActivity => ({
  activityId: row.id,
  activityType: mapActionToActivityType(row.action),
  action: row.action,
  description: formatActivityDescription(row.action, row.category, row.metadata),
  category: row.category,
  ipAddress: row.ip_address,
  userAgent: row.user_agent,
  createdAt: row.timestamp.toISOString(),
});
