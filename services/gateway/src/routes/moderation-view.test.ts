import { describe, expect, it } from 'vitest';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import {
  dataEnvelope,
  listEnvelope,
  moderatorActionToView,
  reportToView,
  supportTicketResponseToView,
  supportTicketToView,
  supportTicketWithThreadToView,
  ticketStatsToView,
} from './moderation-view.js';

const REPORT_BASE = {
  reportId: 'rpt-1',
  reporterId: 'usr-1',
  reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
  reportedEntityId: 'usr-2',
  category: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT,
  severity: ModerationV1.Severity.SEVERITY_HIGH,
  status: ModerationV1.ReportStatus.REPORT_STATUS_PENDING,
  title: 'Bad behaviour',
  description: 'Multiple incidents',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-02T00:00:00.000Z',
  evidence: [],
  metadataJson: '{"context":"chat"}',
} as Parameters<typeof reportToView>[0];

describe('reportToView', () => {
  it('lowercases all enum tokens and unwraps metadata', () => {
    expect(reportToView(REPORT_BASE)).toMatchObject({
      reportId: 'rpt-1',
      reportedEntityType: 'user',
      category: 'harassment',
      severity: 'high',
      status: 'pending',
      metadata: { context: 'chat' },
    });
  });

  it('emits null for optional fields when absent', () => {
    const v = reportToView({ ...REPORT_BASE, metadataJson: '{}' });
    expect(v.reportedUserId).toBeNull();
    expect(v.assignedAt).toBeNull();
    expect(v.resolution).toBeNull();
    expect(v.metadata).toEqual({});
  });
});

describe('moderatorActionToView', () => {
  it('renames the camelCase fields and lowercases enums', () => {
    const v = moderatorActionToView({
      actionId: 'act-1',
      moderatorId: 'mod-1',
      actionType: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_WARNING_ISSUED,
      severity: ModerationV1.Severity.SEVERITY_LOW,
      reason: 'first offence',
      targetEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_MESSAGE,
      targetEntityId: 'msg-1',
      createdAt: '2026-06-01T00:00:00.000Z',
    } as Parameters<typeof moderatorActionToView>[0]);
    expect(v).toMatchObject({
      actionId: 'act-1',
      actionType: 'warning_issued',
      severity: 'low',
      targetEntityType: 'message',
    });
  });
});

describe('supportTicketToView', () => {
  it('lowercases status/priority/category', () => {
    const v = supportTicketToView({
      ticketId: 'tkt-1',
      userEmail: 'a@example.com',
      status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
      priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_HIGH,
      category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_REPORT_BUG,
      subject: 'broken',
      description: '500 on save',
      tags: ['login'],
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    } as Parameters<typeof supportTicketToView>[0]);
    expect(v).toMatchObject({ status: 'open', priority: 'high', category: 'report_bug' });
  });
});

describe('supportTicketResponseToView', () => {
  it('1:1 maps the canonical fields', () => {
    expect(
      supportTicketResponseToView({
        responseId: 'res-1',
        ticketId: 'tkt-1',
        responderId: 'mod-1',
        content: 'check email',
        isInternal: false,
        createdAt: '2026-06-01T00:00:00.000Z',
      })
    ).toEqual({
      responseId: 'res-1',
      ticketId: 'tkt-1',
      responderId: 'mod-1',
      content: 'check email',
      isInternal: false,
      createdAt: '2026-06-01T00:00:00.000Z',
    });
  });
});

describe('supportTicketWithThreadToView', () => {
  const TICKET = {
    ticketId: 'tkt-1',
    userEmail: 'a@example.com',
    status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
    priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL,
    category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_GENERAL_QUESTION,
    subject: 'help',
    description: 'need assistance',
    tags: [],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  } as Parameters<typeof supportTicketWithThreadToView>[0];

  it('embeds the thread with lowercased responder_type tokens', () => {
    const v = supportTicketWithThreadToView(TICKET, [
      {
        responseId: 'res-1',
        ticketId: 'tkt-1',
        responderId: 'mod-1',
        responderType: ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_STAFF,
        content: 'on it',
        isInternal: false,
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    ]);
    expect(v.ticketId).toBe('tkt-1');
    expect(v.responses).toEqual([
      {
        responseId: 'res-1',
        responderId: 'mod-1',
        responderType: 'staff',
        content: 'on it',
        isInternal: false,
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    ]);
  });

  it('defaults an unspecified responder_type to user', () => {
    const v = supportTicketWithThreadToView(TICKET, [
      {
        responseId: 'res-2',
        ticketId: 'tkt-1',
        responderId: 'usr-1',
        responderType:
          ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_UNSPECIFIED,
        content: 'thanks',
        isInternal: false,
        createdAt: '2026-06-01T00:00:00.000Z',
      },
    ]);
    expect(v.responses[0].responderType).toBe('user');
  });
});

describe('ticketStatsToView', () => {
  const STATS = {
    total: 20,
    open: 4,
    inProgress: 3,
    waitingForUser: 2,
    resolved: 6,
    closed: 4,
    escalated: 1,
    overdue: 2,
    unassigned: 5,
    averageResponseTime: 3.26,
    averageResolutionTime: 28.5,
    ticketsToday: 1,
    ticketsThisWeek: 7,
    ticketsThisMonth: 15,
    byPriority: { low: 2, normal: 10, high: 5, urgent: 2, critical: 1 },
    byCategory: [
      {
        category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_TECHNICAL_ISSUE,
        count: 6,
      },
    ],
    staffActivity: [{ staffId: 'mod-1', assignedCount: 8, resolvedCount: 5 }],
  } as Parameters<typeof ticketStatsToView>[0];

  it('lowercases category tokens and passes counts through', () => {
    const v = ticketStatsToView(STATS);
    expect(v.total).toBe(20);
    expect(v.byCategory).toEqual([{ category: 'technical_issue', count: 6 }]);
    expect(v.staffActivity).toEqual([{ staffId: 'mod-1', assignedCount: 8, resolvedCount: 5 }]);
  });

  it('surfaces an absent satisfaction average as null', () => {
    expect(ticketStatsToView(STATS).satisfactionAverage).toBeNull();
  });

  it('keeps a present satisfaction average', () => {
    expect(ticketStatsToView({ ...STATS, satisfactionAverage: 4.2 }).satisfactionAverage).toBe(4.2);
  });
});

describe('envelopes', () => {
  it('dataEnvelope wraps in { data }', () => {
    expect(dataEnvelope({ x: 1 })).toEqual({ data: { x: 1 } });
  });

  it('listEnvelope reports hasNext from nextCursor presence', () => {
    expect(listEnvelope([1, 2], { nextCursor: 'cur' })).toEqual({
      data: [1, 2],
      pagination: { hasNext: true, nextCursor: 'cur' },
    });
    expect(listEnvelope([1, 2], {})).toEqual({
      data: [1, 2],
      pagination: { hasNext: false },
    });
  });
});
