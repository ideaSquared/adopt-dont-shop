// Mappers between the Postgres ENUM string values (moderation.*) and
// the proto enum integers generated under ModerationV1. Same shape as
// services/rescue/src/grpc/enum-map.ts.
//
// 13 distinct enums: ReportEntityType, ReportCategory, Severity,
// ReportStatus, ModeratorActionType, EvidenceParentType, EvidenceType,
// SanctionType, SanctionReason, SupportTicketStatus,
// SupportTicketPriority, SupportTicketCategory,
// SupportTicketResponderType. (ModeratorAction reuses
// ReportEntityType + Severity.)
//
// Convention:
//   - <enum>ToDb takes a proto value, returns the DB string OR throws
//     on UNSPECIFIED / UNRECOGNIZED (sentinel values are caller bugs)
//   - <enum>FromDb takes a DB string, returns the proto value OR
//     throws on unknown DB values (schema drift)
//   - ALL_<DB_ENUM> arrays exported for exhaustiveness tests

import { ModerationV1 } from '@adopt-dont-shop/proto';

// ===== ReportEntityType (also moderator_action.target_entity_type) ===

export type ReportEntityTypeDb =
  | 'user'
  | 'rescue'
  | 'pet'
  | 'application'
  | 'message'
  | 'conversation';

const ENTITY_TYPE_TO_DB: Record<ModerationV1.ReportEntityType, ReportEntityTypeDb | null> = {
  [ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_UNSPECIFIED]: null,
  [ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER]: 'user',
  [ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_RESCUE]: 'rescue',
  [ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_PET]: 'pet',
  [ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_APPLICATION]: 'application',
  [ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_MESSAGE]: 'message',
  [ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_CONVERSATION]: 'conversation',
  [ModerationV1.ReportEntityType.UNRECOGNIZED]: null,
};

const DB_TO_ENTITY_TYPE: Record<ReportEntityTypeDb, ModerationV1.ReportEntityType> = {
  user: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
  rescue: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_RESCUE,
  pet: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_PET,
  application: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_APPLICATION,
  message: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_MESSAGE,
  conversation: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_CONVERSATION,
};

export function entityTypeToDb(proto: ModerationV1.ReportEntityType): ReportEntityTypeDb {
  const db = ENTITY_TYPE_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid ReportEntityType proto value: ${proto}`);
  }
  return db;
}

export function entityTypeFromDb(db: string): ModerationV1.ReportEntityType {
  const proto = DB_TO_ENTITY_TYPE[db as ReportEntityTypeDb];
  if (!proto) {
    throw new Error(`unknown report_entity_type value: ${db}`);
  }
  return proto;
}

// ===== ReportCategory =================================================

export type ReportCategoryDb =
  | 'inappropriate_content'
  | 'spam'
  | 'harassment'
  | 'false_information'
  | 'scam'
  | 'animal_welfare'
  | 'identity_theft'
  | 'other';

const CATEGORY_TO_DB: Record<ModerationV1.ReportCategory, ReportCategoryDb | null> = {
  [ModerationV1.ReportCategory.REPORT_CATEGORY_UNSPECIFIED]: null,
  [ModerationV1.ReportCategory.REPORT_CATEGORY_INAPPROPRIATE_CONTENT]: 'inappropriate_content',
  [ModerationV1.ReportCategory.REPORT_CATEGORY_SPAM]: 'spam',
  [ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT]: 'harassment',
  [ModerationV1.ReportCategory.REPORT_CATEGORY_FALSE_INFORMATION]: 'false_information',
  [ModerationV1.ReportCategory.REPORT_CATEGORY_SCAM]: 'scam',
  [ModerationV1.ReportCategory.REPORT_CATEGORY_ANIMAL_WELFARE]: 'animal_welfare',
  [ModerationV1.ReportCategory.REPORT_CATEGORY_IDENTITY_THEFT]: 'identity_theft',
  [ModerationV1.ReportCategory.REPORT_CATEGORY_OTHER]: 'other',
  [ModerationV1.ReportCategory.UNRECOGNIZED]: null,
};

const DB_TO_CATEGORY: Record<ReportCategoryDb, ModerationV1.ReportCategory> = {
  inappropriate_content: ModerationV1.ReportCategory.REPORT_CATEGORY_INAPPROPRIATE_CONTENT,
  spam: ModerationV1.ReportCategory.REPORT_CATEGORY_SPAM,
  harassment: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT,
  false_information: ModerationV1.ReportCategory.REPORT_CATEGORY_FALSE_INFORMATION,
  scam: ModerationV1.ReportCategory.REPORT_CATEGORY_SCAM,
  animal_welfare: ModerationV1.ReportCategory.REPORT_CATEGORY_ANIMAL_WELFARE,
  identity_theft: ModerationV1.ReportCategory.REPORT_CATEGORY_IDENTITY_THEFT,
  other: ModerationV1.ReportCategory.REPORT_CATEGORY_OTHER,
};

export function categoryToDb(proto: ModerationV1.ReportCategory): ReportCategoryDb {
  const db = CATEGORY_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid ReportCategory proto value: ${proto}`);
  }
  return db;
}

export function categoryFromDb(db: string): ModerationV1.ReportCategory {
  const proto = DB_TO_CATEGORY[db as ReportCategoryDb];
  if (!proto) {
    throw new Error(`unknown report_category value: ${db}`);
  }
  return proto;
}

// ===== Severity (shared by report + moderator_action) ================

export type SeverityDb = 'low' | 'medium' | 'high' | 'critical';

const SEVERITY_TO_DB: Record<ModerationV1.Severity, SeverityDb | null> = {
  [ModerationV1.Severity.SEVERITY_UNSPECIFIED]: null,
  [ModerationV1.Severity.SEVERITY_LOW]: 'low',
  [ModerationV1.Severity.SEVERITY_MEDIUM]: 'medium',
  [ModerationV1.Severity.SEVERITY_HIGH]: 'high',
  [ModerationV1.Severity.SEVERITY_CRITICAL]: 'critical',
  [ModerationV1.Severity.UNRECOGNIZED]: null,
};

const DB_TO_SEVERITY: Record<SeverityDb, ModerationV1.Severity> = {
  low: ModerationV1.Severity.SEVERITY_LOW,
  medium: ModerationV1.Severity.SEVERITY_MEDIUM,
  high: ModerationV1.Severity.SEVERITY_HIGH,
  critical: ModerationV1.Severity.SEVERITY_CRITICAL,
};

export function severityToDb(proto: ModerationV1.Severity): SeverityDb {
  const db = SEVERITY_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid Severity proto value: ${proto}`);
  }
  return db;
}

export function severityFromDb(db: string): ModerationV1.Severity {
  const proto = DB_TO_SEVERITY[db as SeverityDb];
  if (!proto) {
    throw new Error(`unknown severity value: ${db}`);
  }
  return proto;
}

// ===== ReportStatus ==================================================

export type ReportStatusDb = 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';

const REPORT_STATUS_TO_DB: Record<ModerationV1.ReportStatus, ReportStatusDb | null> = {
  [ModerationV1.ReportStatus.REPORT_STATUS_UNSPECIFIED]: null,
  [ModerationV1.ReportStatus.REPORT_STATUS_PENDING]: 'pending',
  [ModerationV1.ReportStatus.REPORT_STATUS_UNDER_REVIEW]: 'under_review',
  [ModerationV1.ReportStatus.REPORT_STATUS_RESOLVED]: 'resolved',
  [ModerationV1.ReportStatus.REPORT_STATUS_DISMISSED]: 'dismissed',
  [ModerationV1.ReportStatus.REPORT_STATUS_ESCALATED]: 'escalated',
  [ModerationV1.ReportStatus.UNRECOGNIZED]: null,
};

const DB_TO_REPORT_STATUS: Record<ReportStatusDb, ModerationV1.ReportStatus> = {
  pending: ModerationV1.ReportStatus.REPORT_STATUS_PENDING,
  under_review: ModerationV1.ReportStatus.REPORT_STATUS_UNDER_REVIEW,
  resolved: ModerationV1.ReportStatus.REPORT_STATUS_RESOLVED,
  dismissed: ModerationV1.ReportStatus.REPORT_STATUS_DISMISSED,
  escalated: ModerationV1.ReportStatus.REPORT_STATUS_ESCALATED,
};

export function reportStatusToDb(proto: ModerationV1.ReportStatus): ReportStatusDb {
  const db = REPORT_STATUS_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid ReportStatus proto value: ${proto}`);
  }
  return db;
}

export function reportStatusFromDb(db: string): ModerationV1.ReportStatus {
  const proto = DB_TO_REPORT_STATUS[db as ReportStatusDb];
  if (!proto) {
    throw new Error(`unknown report_status value: ${db}`);
  }
  return proto;
}

// ===== ModeratorActionType ===========================================

export type ModeratorActionTypeDb =
  | 'warning_issued'
  | 'content_removed'
  | 'user_suspended'
  | 'user_banned'
  | 'account_restricted'
  | 'content_flagged'
  | 'report_dismissed'
  | 'escalation'
  | 'appeal_reviewed'
  | 'no_action';

const ACTION_TYPE_TO_DB: Record<ModerationV1.ModeratorActionType, ModeratorActionTypeDb | null> = {
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_UNSPECIFIED]: null,
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_WARNING_ISSUED]: 'warning_issued',
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_CONTENT_REMOVED]: 'content_removed',
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_USER_SUSPENDED]: 'user_suspended',
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_USER_BANNED]: 'user_banned',
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_ACCOUNT_RESTRICTED]: 'account_restricted',
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_CONTENT_FLAGGED]: 'content_flagged',
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_REPORT_DISMISSED]: 'report_dismissed',
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_ESCALATION]: 'escalation',
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_APPEAL_REVIEWED]: 'appeal_reviewed',
  [ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_NO_ACTION]: 'no_action',
  [ModerationV1.ModeratorActionType.UNRECOGNIZED]: null,
};

const DB_TO_ACTION_TYPE: Record<ModeratorActionTypeDb, ModerationV1.ModeratorActionType> = {
  warning_issued: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_WARNING_ISSUED,
  content_removed: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_CONTENT_REMOVED,
  user_suspended: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_USER_SUSPENDED,
  user_banned: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_USER_BANNED,
  account_restricted: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_ACCOUNT_RESTRICTED,
  content_flagged: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_CONTENT_FLAGGED,
  report_dismissed: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_REPORT_DISMISSED,
  escalation: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_ESCALATION,
  appeal_reviewed: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_APPEAL_REVIEWED,
  no_action: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_NO_ACTION,
};

export function actionTypeToDb(proto: ModerationV1.ModeratorActionType): ModeratorActionTypeDb {
  const db = ACTION_TYPE_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid ModeratorActionType proto value: ${proto}`);
  }
  return db;
}

export function actionTypeFromDb(db: string): ModerationV1.ModeratorActionType {
  const proto = DB_TO_ACTION_TYPE[db as ModeratorActionTypeDb];
  if (!proto) {
    throw new Error(`unknown moderator_action_type value: ${db}`);
  }
  return proto;
}

// ===== EvidenceParentType ============================================

export type EvidenceParentTypeDb = 'report' | 'moderator_action';

const PARENT_TYPE_TO_DB: Record<ModerationV1.EvidenceParentType, EvidenceParentTypeDb | null> = {
  [ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_UNSPECIFIED]: null,
  [ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_REPORT]: 'report',
  [ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_MODERATOR_ACTION]: 'moderator_action',
  [ModerationV1.EvidenceParentType.UNRECOGNIZED]: null,
};

const DB_TO_PARENT_TYPE: Record<EvidenceParentTypeDb, ModerationV1.EvidenceParentType> = {
  report: ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_REPORT,
  moderator_action: ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_MODERATOR_ACTION,
};

export function evidenceParentTypeToDb(
  proto: ModerationV1.EvidenceParentType
): EvidenceParentTypeDb {
  const db = PARENT_TYPE_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid EvidenceParentType proto value: ${proto}`);
  }
  return db;
}

export function evidenceParentTypeFromDb(db: string): ModerationV1.EvidenceParentType {
  const proto = DB_TO_PARENT_TYPE[db as EvidenceParentTypeDb];
  if (!proto) {
    throw new Error(`unknown moderation_evidence_parent_type value: ${db}`);
  }
  return proto;
}

// ===== EvidenceType ==================================================

export type EvidenceTypeDb = 'screenshot' | 'url' | 'text' | 'file';

const EVIDENCE_TYPE_TO_DB: Record<ModerationV1.EvidenceType, EvidenceTypeDb | null> = {
  [ModerationV1.EvidenceType.EVIDENCE_TYPE_UNSPECIFIED]: null,
  [ModerationV1.EvidenceType.EVIDENCE_TYPE_SCREENSHOT]: 'screenshot',
  [ModerationV1.EvidenceType.EVIDENCE_TYPE_URL]: 'url',
  [ModerationV1.EvidenceType.EVIDENCE_TYPE_TEXT]: 'text',
  [ModerationV1.EvidenceType.EVIDENCE_TYPE_FILE]: 'file',
  [ModerationV1.EvidenceType.UNRECOGNIZED]: null,
};

const DB_TO_EVIDENCE_TYPE: Record<EvidenceTypeDb, ModerationV1.EvidenceType> = {
  screenshot: ModerationV1.EvidenceType.EVIDENCE_TYPE_SCREENSHOT,
  url: ModerationV1.EvidenceType.EVIDENCE_TYPE_URL,
  text: ModerationV1.EvidenceType.EVIDENCE_TYPE_TEXT,
  file: ModerationV1.EvidenceType.EVIDENCE_TYPE_FILE,
};

export function evidenceTypeToDb(proto: ModerationV1.EvidenceType): EvidenceTypeDb {
  const db = EVIDENCE_TYPE_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid EvidenceType proto value: ${proto}`);
  }
  return db;
}

export function evidenceTypeFromDb(db: string): ModerationV1.EvidenceType {
  const proto = DB_TO_EVIDENCE_TYPE[db as EvidenceTypeDb];
  if (!proto) {
    throw new Error(`unknown moderation_evidence_type value: ${db}`);
  }
  return proto;
}

// ===== SanctionType ==================================================

export type SanctionTypeDb =
  | 'warning'
  | 'restriction'
  | 'temporary_ban'
  | 'permanent_ban'
  | 'messaging_restriction'
  | 'posting_restriction'
  | 'application_restriction';

const SANCTION_TYPE_TO_DB: Record<ModerationV1.SanctionType, SanctionTypeDb | null> = {
  [ModerationV1.SanctionType.SANCTION_TYPE_UNSPECIFIED]: null,
  [ModerationV1.SanctionType.SANCTION_TYPE_WARNING]: 'warning',
  [ModerationV1.SanctionType.SANCTION_TYPE_RESTRICTION]: 'restriction',
  [ModerationV1.SanctionType.SANCTION_TYPE_TEMPORARY_BAN]: 'temporary_ban',
  [ModerationV1.SanctionType.SANCTION_TYPE_PERMANENT_BAN]: 'permanent_ban',
  [ModerationV1.SanctionType.SANCTION_TYPE_MESSAGING_RESTRICTION]: 'messaging_restriction',
  [ModerationV1.SanctionType.SANCTION_TYPE_POSTING_RESTRICTION]: 'posting_restriction',
  [ModerationV1.SanctionType.SANCTION_TYPE_APPLICATION_RESTRICTION]: 'application_restriction',
  [ModerationV1.SanctionType.UNRECOGNIZED]: null,
};

const DB_TO_SANCTION_TYPE: Record<SanctionTypeDb, ModerationV1.SanctionType> = {
  warning: ModerationV1.SanctionType.SANCTION_TYPE_WARNING,
  restriction: ModerationV1.SanctionType.SANCTION_TYPE_RESTRICTION,
  temporary_ban: ModerationV1.SanctionType.SANCTION_TYPE_TEMPORARY_BAN,
  permanent_ban: ModerationV1.SanctionType.SANCTION_TYPE_PERMANENT_BAN,
  messaging_restriction: ModerationV1.SanctionType.SANCTION_TYPE_MESSAGING_RESTRICTION,
  posting_restriction: ModerationV1.SanctionType.SANCTION_TYPE_POSTING_RESTRICTION,
  application_restriction: ModerationV1.SanctionType.SANCTION_TYPE_APPLICATION_RESTRICTION,
};

export function sanctionTypeToDb(proto: ModerationV1.SanctionType): SanctionTypeDb {
  const db = SANCTION_TYPE_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid SanctionType proto value: ${proto}`);
  }
  return db;
}

export function sanctionTypeFromDb(db: string): ModerationV1.SanctionType {
  const proto = DB_TO_SANCTION_TYPE[db as SanctionTypeDb];
  if (!proto) {
    throw new Error(`unknown user_sanction_type value: ${db}`);
  }
  return proto;
}

// ===== SanctionReason ================================================

export type SanctionReasonDb =
  | 'harassment'
  | 'spam'
  | 'inappropriate_content'
  | 'terms_violation'
  | 'scam_attempt'
  | 'false_information'
  | 'animal_welfare_concern'
  | 'repeated_violations'
  | 'other';

const SANCTION_REASON_TO_DB: Record<ModerationV1.SanctionReason, SanctionReasonDb | null> = {
  [ModerationV1.SanctionReason.SANCTION_REASON_UNSPECIFIED]: null,
  [ModerationV1.SanctionReason.SANCTION_REASON_HARASSMENT]: 'harassment',
  [ModerationV1.SanctionReason.SANCTION_REASON_SPAM]: 'spam',
  [ModerationV1.SanctionReason.SANCTION_REASON_INAPPROPRIATE_CONTENT]: 'inappropriate_content',
  [ModerationV1.SanctionReason.SANCTION_REASON_TERMS_VIOLATION]: 'terms_violation',
  [ModerationV1.SanctionReason.SANCTION_REASON_SCAM_ATTEMPT]: 'scam_attempt',
  [ModerationV1.SanctionReason.SANCTION_REASON_FALSE_INFORMATION]: 'false_information',
  [ModerationV1.SanctionReason.SANCTION_REASON_ANIMAL_WELFARE_CONCERN]: 'animal_welfare_concern',
  [ModerationV1.SanctionReason.SANCTION_REASON_REPEATED_VIOLATIONS]: 'repeated_violations',
  [ModerationV1.SanctionReason.SANCTION_REASON_OTHER]: 'other',
  [ModerationV1.SanctionReason.UNRECOGNIZED]: null,
};

const DB_TO_SANCTION_REASON: Record<SanctionReasonDb, ModerationV1.SanctionReason> = {
  harassment: ModerationV1.SanctionReason.SANCTION_REASON_HARASSMENT,
  spam: ModerationV1.SanctionReason.SANCTION_REASON_SPAM,
  inappropriate_content: ModerationV1.SanctionReason.SANCTION_REASON_INAPPROPRIATE_CONTENT,
  terms_violation: ModerationV1.SanctionReason.SANCTION_REASON_TERMS_VIOLATION,
  scam_attempt: ModerationV1.SanctionReason.SANCTION_REASON_SCAM_ATTEMPT,
  false_information: ModerationV1.SanctionReason.SANCTION_REASON_FALSE_INFORMATION,
  animal_welfare_concern: ModerationV1.SanctionReason.SANCTION_REASON_ANIMAL_WELFARE_CONCERN,
  repeated_violations: ModerationV1.SanctionReason.SANCTION_REASON_REPEATED_VIOLATIONS,
  other: ModerationV1.SanctionReason.SANCTION_REASON_OTHER,
};

export function sanctionReasonToDb(proto: ModerationV1.SanctionReason): SanctionReasonDb {
  const db = SANCTION_REASON_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid SanctionReason proto value: ${proto}`);
  }
  return db;
}

export function sanctionReasonFromDb(db: string): ModerationV1.SanctionReason {
  const proto = DB_TO_SANCTION_REASON[db as SanctionReasonDb];
  if (!proto) {
    throw new Error(`unknown user_sanction_reason value: ${db}`);
  }
  return proto;
}

// ===== SupportTicketStatus ===========================================

export type SupportTicketStatusDb =
  | 'open'
  | 'in_progress'
  | 'waiting_for_user'
  | 'resolved'
  | 'closed'
  | 'escalated';

const TICKET_STATUS_TO_DB: Record<ModerationV1.SupportTicketStatus, SupportTicketStatusDb | null> =
  {
    [ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_UNSPECIFIED]: null,
    [ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN]: 'open',
    [ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_IN_PROGRESS]: 'in_progress',
    [ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_WAITING_FOR_USER]: 'waiting_for_user',
    [ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_RESOLVED]: 'resolved',
    [ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_CLOSED]: 'closed',
    [ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_ESCALATED]: 'escalated',
    [ModerationV1.SupportTicketStatus.UNRECOGNIZED]: null,
  };

const DB_TO_TICKET_STATUS: Record<SupportTicketStatusDb, ModerationV1.SupportTicketStatus> = {
  open: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
  in_progress: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_IN_PROGRESS,
  waiting_for_user: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_WAITING_FOR_USER,
  resolved: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_RESOLVED,
  closed: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_CLOSED,
  escalated: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_ESCALATED,
};

export function ticketStatusToDb(proto: ModerationV1.SupportTicketStatus): SupportTicketStatusDb {
  const db = TICKET_STATUS_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid SupportTicketStatus proto value: ${proto}`);
  }
  return db;
}

export function ticketStatusFromDb(db: string): ModerationV1.SupportTicketStatus {
  const proto = DB_TO_TICKET_STATUS[db as SupportTicketStatusDb];
  if (!proto) {
    throw new Error(`unknown support_ticket_status value: ${db}`);
  }
  return proto;
}

// ===== SupportTicketPriority =========================================

export type SupportTicketPriorityDb = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

const TICKET_PRIORITY_TO_DB: Record<
  ModerationV1.SupportTicketPriority,
  SupportTicketPriorityDb | null
> = {
  [ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_UNSPECIFIED]: null,
  [ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_LOW]: 'low',
  [ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL]: 'normal',
  [ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_HIGH]: 'high',
  [ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_URGENT]: 'urgent',
  [ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_CRITICAL]: 'critical',
  [ModerationV1.SupportTicketPriority.UNRECOGNIZED]: null,
};

const DB_TO_TICKET_PRIORITY: Record<SupportTicketPriorityDb, ModerationV1.SupportTicketPriority> = {
  low: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_LOW,
  normal: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL,
  high: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_HIGH,
  urgent: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_URGENT,
  critical: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_CRITICAL,
};

export function ticketPriorityToDb(
  proto: ModerationV1.SupportTicketPriority
): SupportTicketPriorityDb {
  const db = TICKET_PRIORITY_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid SupportTicketPriority proto value: ${proto}`);
  }
  return db;
}

export function ticketPriorityFromDb(db: string): ModerationV1.SupportTicketPriority {
  const proto = DB_TO_TICKET_PRIORITY[db as SupportTicketPriorityDb];
  if (!proto) {
    throw new Error(`unknown support_ticket_priority value: ${db}`);
  }
  return proto;
}

// ===== SupportTicketCategory =========================================

export type SupportTicketCategoryDb =
  | 'technical_issue'
  | 'account_problem'
  | 'adoption_inquiry'
  | 'payment_issue'
  | 'feature_request'
  | 'report_bug'
  | 'general_question'
  | 'compliance_concern'
  | 'data_request'
  | 'other';

const TICKET_CATEGORY_TO_DB: Record<
  ModerationV1.SupportTicketCategory,
  SupportTicketCategoryDb | null
> = {
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_UNSPECIFIED]: null,
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_TECHNICAL_ISSUE]: 'technical_issue',
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_ACCOUNT_PROBLEM]: 'account_problem',
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_ADOPTION_INQUIRY]: 'adoption_inquiry',
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_PAYMENT_ISSUE]: 'payment_issue',
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_FEATURE_REQUEST]: 'feature_request',
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_REPORT_BUG]: 'report_bug',
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_GENERAL_QUESTION]: 'general_question',
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_COMPLIANCE_CONCERN]:
    'compliance_concern',
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_DATA_REQUEST]: 'data_request',
  [ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_OTHER]: 'other',
  [ModerationV1.SupportTicketCategory.UNRECOGNIZED]: null,
};

const DB_TO_TICKET_CATEGORY: Record<SupportTicketCategoryDb, ModerationV1.SupportTicketCategory> = {
  technical_issue: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_TECHNICAL_ISSUE,
  account_problem: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_ACCOUNT_PROBLEM,
  adoption_inquiry: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_ADOPTION_INQUIRY,
  payment_issue: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_PAYMENT_ISSUE,
  feature_request: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_FEATURE_REQUEST,
  report_bug: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_REPORT_BUG,
  general_question: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_GENERAL_QUESTION,
  compliance_concern: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_COMPLIANCE_CONCERN,
  data_request: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_DATA_REQUEST,
  other: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_OTHER,
};

export function ticketCategoryToDb(
  proto: ModerationV1.SupportTicketCategory
): SupportTicketCategoryDb {
  const db = TICKET_CATEGORY_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid SupportTicketCategory proto value: ${proto}`);
  }
  return db;
}

export function ticketCategoryFromDb(db: string): ModerationV1.SupportTicketCategory {
  const proto = DB_TO_TICKET_CATEGORY[db as SupportTicketCategoryDb];
  if (!proto) {
    throw new Error(`unknown support_ticket_category value: ${db}`);
  }
  return proto;
}

// ===== SupportTicketResponderType ====================================

export type SupportTicketResponderTypeDb = 'staff' | 'user';

const RESPONDER_TYPE_TO_DB: Record<
  ModerationV1.SupportTicketResponderType,
  SupportTicketResponderTypeDb | null
> = {
  [ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_UNSPECIFIED]: null,
  [ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_STAFF]: 'staff',
  [ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_USER]: 'user',
  [ModerationV1.SupportTicketResponderType.UNRECOGNIZED]: null,
};

const DB_TO_RESPONDER_TYPE: Record<
  SupportTicketResponderTypeDb,
  ModerationV1.SupportTicketResponderType
> = {
  staff: ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_STAFF,
  user: ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_USER,
};

export function responderTypeToDb(
  proto: ModerationV1.SupportTicketResponderType
): SupportTicketResponderTypeDb {
  const db = RESPONDER_TYPE_TO_DB[proto];
  if (!db) {
    throw new Error(`invalid SupportTicketResponderType proto value: ${proto}`);
  }
  return db;
}

export function responderTypeFromDb(db: string): ModerationV1.SupportTicketResponderType {
  const proto = DB_TO_RESPONDER_TYPE[db as SupportTicketResponderTypeDb];
  if (!proto) {
    throw new Error(`unknown support_ticket_response_responder_type value: ${db}`);
  }
  return proto;
}

// ===== Exhaustiveness arrays =========================================

export const ALL_ENTITY_TYPES: ReadonlyArray<ReportEntityTypeDb> = [
  'user',
  'rescue',
  'pet',
  'application',
  'message',
  'conversation',
];

export const ALL_CATEGORIES: ReadonlyArray<ReportCategoryDb> = [
  'inappropriate_content',
  'spam',
  'harassment',
  'false_information',
  'scam',
  'animal_welfare',
  'identity_theft',
  'other',
];

export const ALL_SEVERITIES: ReadonlyArray<SeverityDb> = ['low', 'medium', 'high', 'critical'];

export const ALL_REPORT_STATUSES: ReadonlyArray<ReportStatusDb> = [
  'pending',
  'under_review',
  'resolved',
  'dismissed',
  'escalated',
];

export const ALL_ACTION_TYPES: ReadonlyArray<ModeratorActionTypeDb> = [
  'warning_issued',
  'content_removed',
  'user_suspended',
  'user_banned',
  'account_restricted',
  'content_flagged',
  'report_dismissed',
  'escalation',
  'appeal_reviewed',
  'no_action',
];

export const ALL_EVIDENCE_PARENT_TYPES: ReadonlyArray<EvidenceParentTypeDb> = [
  'report',
  'moderator_action',
];

export const ALL_EVIDENCE_TYPES: ReadonlyArray<EvidenceTypeDb> = [
  'screenshot',
  'url',
  'text',
  'file',
];

export const ALL_SANCTION_TYPES: ReadonlyArray<SanctionTypeDb> = [
  'warning',
  'restriction',
  'temporary_ban',
  'permanent_ban',
  'messaging_restriction',
  'posting_restriction',
  'application_restriction',
];

export const ALL_SANCTION_REASONS: ReadonlyArray<SanctionReasonDb> = [
  'harassment',
  'spam',
  'inappropriate_content',
  'terms_violation',
  'scam_attempt',
  'false_information',
  'animal_welfare_concern',
  'repeated_violations',
  'other',
];

export const ALL_TICKET_STATUSES: ReadonlyArray<SupportTicketStatusDb> = [
  'open',
  'in_progress',
  'waiting_for_user',
  'resolved',
  'closed',
  'escalated',
];

export const ALL_TICKET_PRIORITIES: ReadonlyArray<SupportTicketPriorityDb> = [
  'low',
  'normal',
  'high',
  'urgent',
  'critical',
];

export const ALL_TICKET_CATEGORIES: ReadonlyArray<SupportTicketCategoryDb> = [
  'technical_issue',
  'account_problem',
  'adoption_inquiry',
  'payment_issue',
  'feature_request',
  'report_bug',
  'general_question',
  'compliance_concern',
  'data_request',
  'other',
];

export const ALL_RESPONDER_TYPES: ReadonlyArray<SupportTicketResponderTypeDb> = ['staff', 'user'];
