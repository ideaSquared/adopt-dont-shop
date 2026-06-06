import { describe, expect, it } from 'vitest';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import {
  responseRowToProto,
  sanctionRowToProto,
  ticketRowToProto,
  type SupportTicketResponseRow,
  type SupportTicketRow,
  type UserSanctionRow,
} from './sanction-ticket-mapper.js';

function baseSanctionRow(overrides: Partial<UserSanctionRow> = {}): UserSanctionRow {
  return {
    sanction_id: '11111111-1111-1111-1111-111111111111',
    user_id: 'usr-1',
    sanction_type: 'temporary_ban',
    reason: 'harassment',
    description: 'Repeated abusive messages',
    is_active: true,
    start_date: new Date('2026-06-01T12:00:00.000Z'),
    end_date: new Date('2026-06-08T12:00:00.000Z'),
    duration: 7,
    issued_by: 'mod-1',
    report_id: 'rpt-1',
    moderator_action_id: 'act-1',
    appealed_at: null,
    appeal_reason: null,
    appeal_status: null,
    created_at: new Date('2026-06-01T12:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('sanctionRowToProto', () => {
  it('translates an active temporary ban', () => {
    const proto = sanctionRowToProto(baseSanctionRow());
    expect(proto).toEqual({
      sanctionId: '11111111-1111-1111-1111-111111111111',
      userId: 'usr-1',
      sanctionType: ModerationV1.SanctionType.SANCTION_TYPE_TEMPORARY_BAN,
      reason: ModerationV1.SanctionReason.SANCTION_REASON_HARASSMENT,
      description: 'Repeated abusive messages',
      isActive: true,
      startDate: '2026-06-01T12:00:00.000Z',
      endDate: '2026-06-08T12:00:00.000Z',
      duration: 7,
      issuedBy: 'mod-1',
      reportId: 'rpt-1',
      moderatorActionId: 'act-1',
      createdAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-06-01T12:00:00.000Z',
    });
  });

  it('handles a permanent ban (no end_date / duration)', () => {
    const proto = sanctionRowToProto(
      baseSanctionRow({
        sanction_type: 'permanent_ban',
        end_date: null,
        duration: null,
      })
    );
    expect(proto.sanctionType).toBe(ModerationV1.SanctionType.SANCTION_TYPE_PERMANENT_BAN);
    expect(proto.endDate).toBeUndefined();
    expect(proto.duration).toBeUndefined();
  });

  it('populates the appeal chain', () => {
    const proto = sanctionRowToProto(
      baseSanctionRow({
        appealed_at: new Date('2026-06-02T10:00:00.000Z'),
        appeal_reason: 'I was provoked.',
        appeal_status: 'pending',
      })
    );
    expect(proto.appealedAt).toBe('2026-06-02T10:00:00.000Z');
    expect(proto.appealReason).toBe('I was provoked.');
    // appeal_status is forwarded raw — string, not enum.
    expect(proto.appealStatus).toBe('pending');
  });

  it('omits report_id + moderator_action_id when sanction is direct (no originator)', () => {
    const proto = sanctionRowToProto(
      baseSanctionRow({ report_id: null, moderator_action_id: null })
    );
    expect(proto.reportId).toBeUndefined();
    expect(proto.moderatorActionId).toBeUndefined();
  });

  it('throws on unknown reason (schema drift)', () => {
    expect(() => sanctionRowToProto(baseSanctionRow({ reason: 'just_because' }))).toThrowError();
  });
});

function baseTicketRow(overrides: Partial<SupportTicketRow> = {}): SupportTicketRow {
  return {
    ticket_id: '22222222-2222-2222-2222-222222222222',
    user_id: 'usr-1',
    user_email: 'user@example.com',
    user_name: 'Test User',
    assigned_to: null,
    status: 'open',
    priority: 'normal',
    category: 'general_question',
    subject: 'Cannot log in',
    description: 'Tried 3 times, still locked out.',
    tags: ['login', 'auth'],
    metadata: { ip: '1.2.3.4' },
    first_response_at: null,
    last_response_at: null,
    resolved_at: null,
    closed_at: null,
    created_at: new Date('2026-06-01T12:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('ticketRowToProto', () => {
  it('translates a freshly-opened ticket', () => {
    const proto = ticketRowToProto(baseTicketRow());
    expect(proto).toEqual({
      ticketId: '22222222-2222-2222-2222-222222222222',
      userId: 'usr-1',
      userEmail: 'user@example.com',
      userName: 'Test User',
      status: ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_OPEN,
      priority: ModerationV1.SupportTicketPriority.SUPPORT_TICKET_PRIORITY_NORMAL,
      category: ModerationV1.SupportTicketCategory.SUPPORT_TICKET_CATEGORY_GENERAL_QUESTION,
      subject: 'Cannot log in',
      description: 'Tried 3 times, still locked out.',
      tags: ['login', 'auth'],
      metadataJson: '{"ip":"1.2.3.4"}',
      createdAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-06-01T12:00:00.000Z',
    });
  });

  it('handles a ticket from an unauthenticated user (no user_id / user_name)', () => {
    const proto = ticketRowToProto(baseTicketRow({ user_id: null, user_name: null }));
    expect(proto.userId).toBeUndefined();
    expect(proto.userName).toBeUndefined();
    // user_email is always required (the contact channel).
    expect(proto.userEmail).toBe('user@example.com');
  });

  it('populates the resolution chain for a resolved ticket', () => {
    const proto = ticketRowToProto(
      baseTicketRow({
        status: 'resolved',
        assigned_to: 'staff-1',
        first_response_at: new Date('2026-06-01T13:00:00.000Z'),
        last_response_at: new Date('2026-06-01T14:00:00.000Z'),
        resolved_at: new Date('2026-06-01T14:30:00.000Z'),
      })
    );
    expect(proto.status).toBe(ModerationV1.SupportTicketStatus.SUPPORT_TICKET_STATUS_RESOLVED);
    expect(proto.assignedTo).toBe('staff-1');
    expect(proto.firstResponseAt).toBe('2026-06-01T13:00:00.000Z');
    expect(proto.lastResponseAt).toBe('2026-06-01T14:00:00.000Z');
    expect(proto.resolvedAt).toBe('2026-06-01T14:30:00.000Z');
  });

  it('normalises null metadata to "{}"', () => {
    const proto = ticketRowToProto(baseTicketRow({ metadata: null }));
    expect(proto.metadataJson).toBe('{}');
  });

  it('forwards tags as a string[] (Postgres text[])', () => {
    const proto = ticketRowToProto(baseTicketRow({ tags: ['urgent', 'data-loss', 'paid-tier'] }));
    expect(proto.tags).toEqual(['urgent', 'data-loss', 'paid-tier']);
  });

  it('throws on unknown category (schema drift)', () => {
    expect(() => ticketRowToProto(baseTicketRow({ category: 'spam' }))).toThrowError();
  });
});

function baseResponseRow(
  overrides: Partial<SupportTicketResponseRow> = {}
): SupportTicketResponseRow {
  return {
    response_id: '33333333-3333-3333-3333-333333333333',
    ticket_id: '22222222-2222-2222-2222-222222222222',
    responder_id: 'staff-1',
    responder_type: 'staff',
    content: 'Try clearing your cookies.',
    is_internal: false,
    created_at: new Date('2026-06-01T13:00:00.000Z'),
    ...overrides,
  };
}

describe('responseRowToProto', () => {
  it('translates a public staff response', () => {
    const proto = responseRowToProto(baseResponseRow());
    expect(proto).toEqual({
      responseId: '33333333-3333-3333-3333-333333333333',
      ticketId: '22222222-2222-2222-2222-222222222222',
      responderId: 'staff-1',
      responderType: ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_STAFF,
      content: 'Try clearing your cookies.',
      isInternal: false,
      createdAt: '2026-06-01T13:00:00.000Z',
    });
  });

  it('marks an internal staff note', () => {
    const proto = responseRowToProto(
      baseResponseRow({
        is_internal: true,
        content: 'User is on free tier — escalate gently.',
      })
    );
    expect(proto.isInternal).toBe(true);
  });

  it('handles a user response', () => {
    const proto = responseRowToProto(
      baseResponseRow({
        responder_id: 'usr-1',
        responder_type: 'user',
        content: 'That worked, thanks!',
      })
    );
    expect(proto.responderType).toBe(
      ModerationV1.SupportTicketResponderType.SUPPORT_TICKET_RESPONDER_TYPE_USER
    );
  });

  it('throws on unknown responder_type (schema drift)', () => {
    expect(() => responseRowToProto(baseResponseRow({ responder_type: 'bot' }))).toThrowError();
  });
});
