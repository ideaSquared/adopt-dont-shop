// Event-stream → TimelineEntry projection.
//
// The SPA's application timeline is the chronological list of STATUS
// transitions. We derive it straight from the event stream rather than
// the application_status_transitions read-model table: the projector
// (event-store.ts projectReadModel) only maintains the `applications`
// row, so the transitions table isn't populated yet. The event stream
// is the authoritative source either way — folding it incrementally
// gives us the (from_status → to_status) pair plus the forensic
// metadata (who, when) each entry needs.
//
// An entry is emitted for an event only when it changes the aggregate's
// status. The first event (draftCreated) always emits — from_status
// UNSPECIFIED — so the timeline opens with "application started".
// Non-status events (e.g. draftAnswersSaved) and idempotent re-runs
// (a second startReview) produce no entry.

import { ApplicationsV1, type TimelineEntry } from '@adopt-dont-shop/proto';

import {
  apply,
  INITIAL_STATE,
  type ApplicationEvent,
  type ApplicationStatus,
} from '../domain/index.js';

import { statusFromDb } from './enum-map.js';
import type { EventStoreRow } from './event-store.js';

const UNSPECIFIED = ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNSPECIFIED;

// Surface the human-readable reason/note an event carried, when it has
// one. Different events name the field differently (reason | note |
// notes) so we check each in turn.
function noteOf(event: ApplicationEvent): string | null {
  const candidate = event as { reason?: unknown; note?: unknown; notes?: unknown };
  const value = candidate.reason ?? candidate.note ?? candidate.notes;
  return typeof value === 'string' && value !== '' ? value : null;
}

export function buildTimeline(rows: ReadonlyArray<EventStoreRow>): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  let state = INITIAL_STATE;
  let prevStatus: ApplicationStatus | null = null;

  for (const row of rows) {
    const next = apply(state, row.event_data);
    const changed = prevStatus === null || next.status !== prevStatus;

    if (changed) {
      const entry: TimelineEntry = {
        entryId: row.event_id,
        applicationId: next.applicationId,
        fromStatus: prevStatus === null ? UNSPECIFIED : statusFromDb(prevStatus),
        toStatus: statusFromDb(next.status),
        actorUserId: row.actor_user_id ?? '',
        occurredAt: row.occurred_at.toISOString(),
      };
      const note = noteOf(row.event_data);
      if (note !== null) {
        entry.note = note;
      }
      entries.push(entry);
    }

    state = next;
    prevStatus = next.status;
  }

  return entries;
}
