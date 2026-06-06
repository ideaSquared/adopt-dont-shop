import { describe, expect, it } from 'vitest';

import { ModerationV1 } from '@adopt-dont-shop/proto';

import {
  actionRowToProto,
  evidenceRowToProto,
  type EvidenceRow,
  type ModeratorActionRow,
} from './action-evidence-mapper.js';

function baseActionRow(overrides: Partial<ModeratorActionRow> = {}): ModeratorActionRow {
  return {
    action_id: '11111111-1111-1111-1111-111111111111',
    moderator_id: 'mod-1',
    report_id: 'rpt-1',
    target_entity_type: 'user',
    target_entity_id: 'usr-1',
    target_user_id: 'usr-1',
    action_type: 'warning_issued',
    severity: 'medium',
    reason: 'First infraction',
    description: null,
    metadata: {},
    duration: null,
    expires_at: null,
    is_active: true,
    acknowledged_at: null,
    created_at: new Date('2026-06-01T12:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('actionRowToProto', () => {
  it('translates a warning issued without a duration', () => {
    const proto = actionRowToProto(baseActionRow());
    expect(proto).toEqual({
      actionId: '11111111-1111-1111-1111-111111111111',
      moderatorId: 'mod-1',
      reportId: 'rpt-1',
      targetEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
      targetEntityId: 'usr-1',
      targetUserId: 'usr-1',
      actionType: ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_WARNING_ISSUED,
      severity: ModerationV1.Severity.SEVERITY_MEDIUM,
      reason: 'First infraction',
      metadataJson: '{}',
      isActive: true,
      createdAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-06-01T12:00:00.000Z',
    });
  });

  it('populates duration + expiresAt for a temporary suspension', () => {
    const proto = actionRowToProto(
      baseActionRow({
        action_type: 'user_suspended',
        severity: 'high',
        duration: 7,
        expires_at: new Date('2026-06-08T12:00:00.000Z'),
      })
    );
    expect(proto.actionType).toBe(
      ModerationV1.ModeratorActionType.MODERATOR_ACTION_TYPE_USER_SUSPENDED
    );
    expect(proto.duration).toBe(7);
    expect(proto.expiresAt).toBe('2026-06-08T12:00:00.000Z');
  });

  it('omits report_id for an auto-flagged action (no originating report)', () => {
    const proto = actionRowToProto(baseActionRow({ report_id: null }));
    expect(proto.reportId).toBeUndefined();
  });

  it('omits target_user_id for non-user targets (content removed on pet listing)', () => {
    const proto = actionRowToProto(
      baseActionRow({
        target_entity_type: 'pet',
        target_user_id: null,
        action_type: 'content_removed',
      })
    );
    expect(proto.targetUserId).toBeUndefined();
    expect(proto.targetEntityType).toBe(ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_PET);
  });

  it('populates acknowledgedAt for a dismissed sanction banner', () => {
    const proto = actionRowToProto(
      baseActionRow({ acknowledged_at: new Date('2026-06-02T10:00:00.000Z') })
    );
    expect(proto.acknowledgedAt).toBe('2026-06-02T10:00:00.000Z');
  });

  it('normalises null metadata to "{}"', () => {
    const proto = actionRowToProto(baseActionRow({ metadata: null }));
    expect(proto.metadataJson).toBe('{}');
  });

  it('throws on unknown action_type (schema drift)', () => {
    expect(() => actionRowToProto(baseActionRow({ action_type: 'censored' }))).toThrowError();
  });
});

function baseEvidenceRow(overrides: Partial<EvidenceRow> = {}): EvidenceRow {
  return {
    evidence_id: '22222222-2222-2222-2222-222222222222',
    parent_type: 'report',
    parent_id: 'rpt-1',
    type: 'screenshot',
    content: 's3://moderation-evidence/screenshots/abc.png',
    description: 'Screenshot of abusive DM',
    uploaded_at: new Date('2026-06-01T12:30:00.000Z'),
    ...overrides,
  };
}

describe('evidenceRowToProto', () => {
  it('translates a screenshot evidence attached to a report', () => {
    const proto = evidenceRowToProto(baseEvidenceRow());
    expect(proto).toEqual({
      evidenceId: '22222222-2222-2222-2222-222222222222',
      parentType: ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_REPORT,
      parentId: 'rpt-1',
      type: ModerationV1.EvidenceType.EVIDENCE_TYPE_SCREENSHOT,
      content: 's3://moderation-evidence/screenshots/abc.png',
      description: 'Screenshot of abusive DM',
      uploadedAt: '2026-06-01T12:30:00.000Z',
    });
  });

  it('handles a url-type evidence attached to a moderator_action', () => {
    const proto = evidenceRowToProto(
      baseEvidenceRow({
        parent_type: 'moderator_action',
        type: 'url',
        content: 'https://example.com/policy-violation',
      })
    );
    expect(proto.parentType).toBe(
      ModerationV1.EvidenceParentType.EVIDENCE_PARENT_TYPE_MODERATOR_ACTION
    );
    expect(proto.type).toBe(ModerationV1.EvidenceType.EVIDENCE_TYPE_URL);
    expect(proto.content).toBe('https://example.com/policy-violation');
  });

  it('omits description when NULL', () => {
    const proto = evidenceRowToProto(baseEvidenceRow({ description: null }));
    expect(proto.description).toBeUndefined();
  });

  it('throws on unknown evidence type (schema drift)', () => {
    expect(() => evidenceRowToProto(baseEvidenceRow({ type: 'video' }))).toThrowError();
  });
});
