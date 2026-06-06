import { describe, expect, it } from 'vitest';

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import type { ApplicationEvent } from '../domain/index.js';

import type { EventStoreRow } from './event-store.js';
import { buildTimeline } from './timeline.js';

const S = ApplicationsV1.ApplicationStatus;

function row(version: number, event: ApplicationEvent, actor: string | null = null): EventStoreRow {
  return {
    event_id: `evt-${version}`,
    event_data: event,
    occurred_at: new Date(`2026-06-0${version}T12:00:00.000Z`),
    actor_user_id: actor,
    version,
  };
}

const created = row(1, {
  type: 'draftCreated',
  applicationId: 'app-1',
  adopterId: 'usr-1',
  petId: 'pet-1',
  rescueId: 'rsc-1',
  at: '2026-06-01T12:00:00.000Z',
});

const answersSaved = row(2, {
  type: 'draftAnswersSaved',
  applicationId: 'app-1',
  answersPatch: { q1: 'a' },
  references: null,
  at: '2026-06-02T12:00:00.000Z',
});

const submitted = row(3, {
  type: 'draftSubmitted',
  applicationId: 'app-1',
  at: '2026-06-03T12:00:00.000Z',
});

describe('buildTimeline', () => {
  it('returns no entries for an empty stream', () => {
    expect(buildTimeline([])).toEqual([]);
  });

  it('opens the timeline with from_status UNSPECIFIED on draftCreated', () => {
    const [entry] = buildTimeline([created]);
    expect(entry).toMatchObject({
      entryId: 'evt-1',
      applicationId: 'app-1',
      fromStatus: S.APPLICATION_STATUS_UNSPECIFIED,
      toStatus: S.APPLICATION_STATUS_DRAFT,
      occurredAt: '2026-06-01T12:00:00.000Z',
    });
  });

  it('skips events that do not change status', () => {
    const entries = buildTimeline([created, answersSaved, submitted]);
    // draftAnswersSaved (v2) leaves status at draft → no entry for it.
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      fromStatus: S.APPLICATION_STATUS_DRAFT,
      toStatus: S.APPLICATION_STATUS_SUBMITTED,
    });
  });

  it('stamps the actor that produced the transition', () => {
    const reviewStarted = row(
      4,
      {
        type: 'reviewStarted',
        applicationId: 'app-1',
        actorUserId: 'staff-1',
        note: null,
        at: '2026-06-04T12:00:00.000Z',
      },
      'staff-1'
    );
    const entries = buildTimeline([created, submitted, reviewStarted]);
    expect(entries[2]).toMatchObject({
      toStatus: S.APPLICATION_STATUS_UNDER_REVIEW,
      actorUserId: 'staff-1',
    });
  });

  it('surfaces the reason/notes an event carried as the entry note', () => {
    const rejected = row(4, {
      type: 'rejected',
      applicationId: 'app-1',
      actorUserId: 'staff-1',
      reason: 'home unsuitable',
      at: '2026-06-04T12:00:00.000Z',
    });
    const entries = buildTimeline([created, submitted, rejected]);
    expect(entries[2]).toMatchObject({
      toStatus: S.APPLICATION_STATUS_REJECTED,
      note: 'home unsuitable',
    });
  });

  it('does not set a note when the event carried none', () => {
    expect(buildTimeline([created])[0].note).toBeUndefined();
  });
});
