// Row → proto mappers for ModeratorAction + Evidence.
//
// DB row shapes mirror moderation.moderator_actions +
// moderation.moderation_evidence from #886. Proto messages are
// ModeratorAction + Evidence from #889. Pure functions — no I/O.
//
// metadata JSONB column on moderator_actions stringifies via
// JSON.stringify; null normalises to '{}' (blob trick — same as
// Report.metadataJson in mapper.ts).

import type { Evidence, ModeratorAction } from '@adopt-dont-shop/proto';

import {
  actionTypeFromDb,
  entityTypeFromDb,
  evidenceParentTypeFromDb,
  evidenceTypeFromDb,
  severityFromDb,
} from './enum-map.js';

// --- ModeratorAction row → proto -------------------------------------

export type ModeratorActionRow = {
  action_id: string;
  moderator_id: string;
  report_id: string | null;
  target_entity_type: string;
  target_entity_id: string;
  target_user_id: string | null;
  action_type: string;
  severity: string;
  reason: string;
  description: string | null;
  metadata: unknown;
  duration: number | null;
  expires_at: Date | null;
  is_active: boolean;
  acknowledged_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export function actionRowToProto(row: ModeratorActionRow): ModeratorAction {
  const action: ModeratorAction = {
    actionId: row.action_id,
    moderatorId: row.moderator_id,
    targetEntityType: entityTypeFromDb(row.target_entity_type),
    targetEntityId: row.target_entity_id,
    actionType: actionTypeFromDb(row.action_type),
    severity: severityFromDb(row.severity),
    reason: row.reason,
    metadataJson: JSON.stringify(row.metadata ?? {}),
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  if (row.report_id !== null) {
    action.reportId = row.report_id;
  }
  if (row.target_user_id !== null) {
    action.targetUserId = row.target_user_id;
  }
  if (row.description !== null) {
    action.description = row.description;
  }
  if (row.duration !== null) {
    action.duration = row.duration;
  }
  if (row.expires_at !== null) {
    action.expiresAt = row.expires_at.toISOString();
  }
  if (row.acknowledged_at !== null) {
    action.acknowledgedAt = row.acknowledged_at.toISOString();
  }

  return action;
}

// --- Evidence row → proto --------------------------------------------

export type EvidenceRow = {
  evidence_id: string;
  parent_type: string;
  parent_id: string;
  type: string;
  content: string;
  description: string | null;
  uploaded_at: Date;
};

export function evidenceRowToProto(row: EvidenceRow): Evidence {
  const evidence: Evidence = {
    evidenceId: row.evidence_id,
    parentType: evidenceParentTypeFromDb(row.parent_type),
    parentId: row.parent_id,
    type: evidenceTypeFromDb(row.type),
    content: row.content,
    uploadedAt: row.uploaded_at.toISOString(),
  };

  if (row.description !== null) {
    evidence.description = row.description;
  }

  return evidence;
}
