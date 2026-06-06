import { describe, expect, it } from 'vitest';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import {
  ALL_ACTION_TYPES,
  ALL_CATEGORIES,
  ALL_ENTITY_TYPES,
  ALL_EVIDENCE_PARENT_TYPES,
  ALL_EVIDENCE_TYPES,
  ALL_REPORT_STATUSES,
  ALL_RESPONDER_TYPES,
  ALL_SANCTION_REASONS,
  ALL_SANCTION_TYPES,
  ALL_SEVERITIES,
  ALL_TICKET_CATEGORIES,
  ALL_TICKET_PRIORITIES,
  ALL_TICKET_STATUSES,
  actionTypeFromDb,
  actionTypeToDb,
  categoryFromDb,
  categoryToDb,
  entityTypeFromDb,
  entityTypeToDb,
  evidenceParentTypeFromDb,
  evidenceParentTypeToDb,
  evidenceTypeFromDb,
  evidenceTypeToDb,
  reportStatusFromDb,
  reportStatusToDb,
  responderTypeFromDb,
  responderTypeToDb,
  sanctionReasonFromDb,
  sanctionReasonToDb,
  sanctionTypeFromDb,
  sanctionTypeToDb,
  severityFromDb,
  severityToDb,
  ticketCategoryFromDb,
  ticketCategoryToDb,
  ticketPriorityFromDb,
  ticketPriorityToDb,
  ticketStatusFromDb,
  ticketStatusToDb,
} from './enum-map.js';

// Bite #10 filter: ts-proto adds UNRECOGNIZED = -1 to every proto3
// enum; UNSPECIFIED = 0 is the proto3 sentinel. Both filtered with
// `v > 0` so the populated-count check matches the DB variant count.
function populatedCount(enumObj: Record<string, string | number>): number {
  return Object.values(enumObj).filter(v => typeof v === 'number' && v > 0).length;
}

describe('ReportEntityType mapping', () => {
  it.each(ALL_ENTITY_TYPES)('round-trips %s', db => {
    expect(entityTypeToDb(entityTypeFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      entityTypeToDb(ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_UNSPECIFIED)
    ).toThrowError();
    expect(() => entityTypeFromDb('unknown')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.ReportEntityType)).toBe(ALL_ENTITY_TYPES.length);
  });
});

describe('ReportCategory mapping', () => {
  it.each(ALL_CATEGORIES)('round-trips %s', db => {
    expect(categoryToDb(categoryFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      categoryToDb(ModerationV1.ReportCategory.REPORT_CATEGORY_UNSPECIFIED)
    ).toThrowError();
    expect(() => categoryFromDb('not_a_category')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.ReportCategory)).toBe(ALL_CATEGORIES.length);
  });
});

describe('Severity mapping (shared by report + moderator_action)', () => {
  it.each(ALL_SEVERITIES)('round-trips %s', db => {
    expect(severityToDb(severityFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() => severityToDb(ModerationV1.Severity.SEVERITY_UNSPECIFIED)).toThrowError();
    expect(() => severityFromDb('extreme')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.Severity)).toBe(ALL_SEVERITIES.length);
  });
});

describe('ReportStatus mapping', () => {
  it.each(ALL_REPORT_STATUSES)('round-trips %s', db => {
    expect(reportStatusToDb(reportStatusFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      reportStatusToDb(ModerationV1.ReportStatus.REPORT_STATUS_UNSPECIFIED)
    ).toThrowError();
    expect(() => reportStatusFromDb('done')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.ReportStatus)).toBe(ALL_REPORT_STATUSES.length);
  });
});

describe('ModeratorActionType mapping', () => {
  it.each(ALL_ACTION_TYPES)('round-trips %s', db => {
    expect(actionTypeToDb(actionTypeFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      actionTypeToDb(ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_UNSPECIFIED)
    ).toThrowError();
    expect(() => actionTypeFromDb('unknown_action')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.ModeratorActionType)).toBe(ALL_ACTION_TYPES.length);
  });
});

describe('EvidenceParentType mapping', () => {
  it.each(ALL_EVIDENCE_PARENT_TYPES)('round-trips %s', db => {
    expect(evidenceParentTypeToDb(evidenceParentTypeFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      evidenceParentTypeToDb(ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_UNSPECIFIED)
    ).toThrowError();
    expect(() => evidenceParentTypeFromDb('chat')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.EvidenceParentType)).toBe(ALL_EVIDENCE_PARENT_TYPES.length);
  });
});

describe('EvidenceType mapping', () => {
  it.each(ALL_EVIDENCE_TYPES)('round-trips %s', db => {
    expect(evidenceTypeToDb(evidenceTypeFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      evidenceTypeToDb(ModerationV1.EvidenceType.EVIDENCE_TYPE_UNSPECIFIED)
    ).toThrowError();
    expect(() => evidenceTypeFromDb('video')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.EvidenceType)).toBe(ALL_EVIDENCE_TYPES.length);
  });
});

describe('SanctionType mapping', () => {
  it.each(ALL_SANCTION_TYPES)('round-trips %s', db => {
    expect(sanctionTypeToDb(sanctionTypeFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      sanctionTypeToDb(ModerationV1.SanctionType.SANCTION_TYPE_UNSPECIFIED)
    ).toThrowError();
    expect(() => sanctionTypeFromDb('forever_ban')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.SanctionType)).toBe(ALL_SANCTION_TYPES.length);
  });
});

describe('SanctionReason mapping', () => {
  it.each(ALL_SANCTION_REASONS)('round-trips %s', db => {
    expect(sanctionReasonToDb(sanctionReasonFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      sanctionReasonToDb(ModerationV1.SanctionReason.SANCTION_REASON_UNSPECIFIED)
    ).toThrowError();
    expect(() => sanctionReasonFromDb('reason_unknown')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.SanctionReason)).toBe(ALL_SANCTION_REASONS.length);
  });
});

describe('SupportTicketStatus mapping', () => {
  it.each(ALL_TICKET_STATUSES)('round-trips %s', db => {
    expect(ticketStatusToDb(ticketStatusFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      ticketStatusToDb(ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_UNSPECIFIED)
    ).toThrowError();
    expect(() => ticketStatusFromDb('archived')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.SupportTicketStatus)).toBe(ALL_TICKET_STATUSES.length);
  });
});

describe('SupportTicketPriority mapping', () => {
  it.each(ALL_TICKET_PRIORITIES)('round-trips %s', db => {
    expect(ticketPriorityToDb(ticketPriorityFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      ticketPriorityToDb(ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_UNSPECIFIED)
    ).toThrowError();
    expect(() => ticketPriorityFromDb('p0')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.SupportTicketPriority)).toBe(ALL_TICKET_PRIORITIES.length);
  });
});

describe('SupportTicketCategory mapping', () => {
  it.each(ALL_TICKET_CATEGORIES)('round-trips %s', db => {
    expect(ticketCategoryToDb(ticketCategoryFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      ticketCategoryToDb(ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_UNSPECIFIED)
    ).toThrowError();
    expect(() => ticketCategoryFromDb('marketing')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.SupportTicketCategory)).toBe(ALL_TICKET_CATEGORIES.length);
  });
});

describe('SupportTicketResponderType mapping', () => {
  it.each(ALL_RESPONDER_TYPES)('round-trips %s', db => {
    expect(responderTypeToDb(responderTypeFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() =>
      responderTypeToDb(
        ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_UNSPECIFIED
      )
    ).toThrowError();
    expect(() => responderTypeFromDb('bot')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(ModerationV1.SupportTicketResponderType)).toBe(
      ALL_RESPONDER_TYPES.length
    );
  });
});
