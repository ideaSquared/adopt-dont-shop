import { describe, expect, it } from 'vitest';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import {
  reportRowToProto,
  transitionRowToProto,
  type ReportRow,
  type ReportStatusTransitionRow,
} from './mapper.js';

function baseReportRow(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    report_id: '11111111-1111-1111-1111-111111111111',
    reporter_id: '22222222-2222-2222-2222-222222222222',
    reported_entity_type: 'user',
    reported_entity_id: '33333333-3333-3333-3333-333333333333',
    reported_user_id: '33333333-3333-3333-3333-333333333333',
    category: 'harassment',
    severity: 'high',
    status: 'pending',
    title: 'Abusive DMs',
    description: 'User sent threatening messages.',
    metadata: { screenshot_count: 3 },
    assigned_moderator: null,
    assigned_at: null,
    resolved_by: null,
    resolved_at: null,
    resolution: null,
    resolution_notes: null,
    escalated_to: null,
    escalated_at: null,
    escalation_reason: null,
    created_at: new Date('2026-06-01T12:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('reportRowToProto', () => {
  it('translates a freshly-filed pending report', () => {
    const proto = reportRowToProto(baseReportRow());
    expect(proto).toEqual({
      reportId: '11111111-1111-1111-1111-111111111111',
      reporterId: '22222222-2222-2222-2222-222222222222',
      reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
      reportedEntityId: '33333333-3333-3333-3333-333333333333',
      reportedUserId: '33333333-3333-3333-3333-333333333333',
      category: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT,
      severity: ModerationV1.Severity.SEVERITY_HIGH,
      status: ModerationV1.ReportStatus.REPORT_STATUS_PENDING,
      title: 'Abusive DMs',
      description: 'User sent threatening messages.',
      metadataJson: '{"screenshot_count":3}',
      createdAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-06-01T12:00:00.000Z',
    });
  });

  it('populates the resolution chain for a resolved report', () => {
    const proto = reportRowToProto(
      baseReportRow({
        status: 'resolved',
        assigned_moderator: 'mod-1',
        assigned_at: new Date('2026-06-02T09:00:00.000Z'),
        resolved_by: 'mod-1',
        resolved_at: new Date('2026-06-03T15:00:00.000Z'),
        resolution: 'action_taken',
        resolution_notes: 'User suspended for 7 days.',
      })
    );
    expect(proto.status).toBe(ModerationV1.ReportStatus.REPORT_STATUS_RESOLVED);
    expect(proto.assignedModerator).toBe('mod-1');
    expect(proto.assignedAt).toBe('2026-06-02T09:00:00.000Z');
    expect(proto.resolvedBy).toBe('mod-1');
    expect(proto.resolvedAt).toBe('2026-06-03T15:00:00.000Z');
    expect(proto.resolution).toBe('action_taken');
    expect(proto.resolutionNotes).toBe('User suspended for 7 days.');
  });

  it('populates the escalation chain for an escalated report', () => {
    const proto = reportRowToProto(
      baseReportRow({
        status: 'escalated',
        escalated_to: 'admin-1',
        escalated_at: new Date('2026-06-04T11:00:00.000Z'),
        escalation_reason: 'Requires legal review.',
      })
    );
    expect(proto.status).toBe(ModerationV1.ReportStatus.REPORT_STATUS_ESCALATED);
    expect(proto.escalatedTo).toBe('admin-1');
    expect(proto.escalatedAt).toBe('2026-06-04T11:00:00.000Z');
    expect(proto.escalationReason).toBe('Requires legal review.');
  });

  it('omits reportedUserId for a non-user-entity report', () => {
    const proto = reportRowToProto(
      baseReportRow({
        reported_entity_type: 'pet',
        reported_user_id: null,
      })
    );
    expect(proto.reportedUserId).toBeUndefined();
    expect(proto.reportedEntityType).toBe(ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_PET);
  });

  it('normalises null metadata to "{}"', () => {
    const proto = reportRowToProto(baseReportRow({ metadata: null }));
    expect(proto.metadataJson).toBe('{}');
  });

  it('throws on unknown category (schema drift)', () => {
    expect(() => reportRowToProto(baseReportRow({ category: 'rant' }))).toThrowError();
  });
});

function baseTransitionRow(
  overrides: Partial<ReportStatusTransitionRow> = {}
): ReportStatusTransitionRow {
  return {
    transition_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    report_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    from_status: 'pending',
    to_status: 'under_review',
    transitioned_at: new Date('2026-06-02T09:00:00.000Z'),
    transitioned_by: 'mod-1',
    reason: 'Started review.',
    ...overrides,
  };
}

describe('transitionRowToProto', () => {
  it('translates a standard transition', () => {
    const proto = transitionRowToProto(baseTransitionRow());
    expect(proto).toEqual({
      transitionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reportId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      fromStatus: ModerationV1.ReportStatus.REPORT_STATUS_PENDING,
      toStatus: ModerationV1.ReportStatus.REPORT_STATUS_UNDER_REVIEW,
      transitionedAt: '2026-06-02T09:00:00.000Z',
      transitionedBy: 'mod-1',
      reason: 'Started review.',
    });
  });

  it('omits fromStatus for the first transition (report creation)', () => {
    const proto = transitionRowToProto(
      baseTransitionRow({ from_status: null, to_status: 'pending', reason: null })
    );
    expect(proto.fromStatus).toBeUndefined();
    expect(proto.toStatus).toBe(ModerationV1.ReportStatus.REPORT_STATUS_PENDING);
    expect(proto.reason).toBeUndefined();
  });

  it('omits transitionedBy when NULL (system transition)', () => {
    const proto = transitionRowToProto(baseTransitionRow({ transitioned_by: null }));
    expect(proto.transitionedBy).toBeUndefined();
  });
});
