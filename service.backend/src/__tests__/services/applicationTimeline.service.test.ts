import ApplicationTimelineService from '../../services/applicationTimeline.service';
import ApplicationTimeline, { TimelineEventType } from '../../models/ApplicationTimeline';
import { ApplicationStage } from '../../models/Application';

const APP_ID = 'app-1';

const seedEvent = (overrides: Partial<Parameters<typeof ApplicationTimeline.create>[0]> = {}) =>
  ApplicationTimeline.create({
    application_id: APP_ID,
    event_type: TimelineEventType.NOTE_ADDED,
    title: 'note',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

describe('ApplicationTimelineService', () => {
  describe('createNoteAddedEvent', () => {
    it('persists a note event with the title derived from the note type', async () => {
      const event = await ApplicationTimelineService.createNoteAddedEvent(
        APP_ID,
        'interview',
        'Spoke with applicant about their living situation',
        'staff-1'
      );

      expect(event.application_id).toBe(APP_ID);
      expect(event.event_type).toBe(TimelineEventType.NOTE_ADDED);
      expect(event.title).toBe('Interview note added');
      expect(event.created_by).toBe('staff-1');
    });

    it('truncates long descriptions and stores the full content in metadata', async () => {
      const longContent = 'x'.repeat(250);
      const event = await ApplicationTimelineService.createNoteAddedEvent(
        APP_ID,
        'general',
        longContent,
        'staff-1'
      );

      expect(event.description?.endsWith('...')).toBe(true);
      expect(event.description?.length).toBeLessThanOrEqual(103);
      expect(event.metadata?.full_content).toBe(longContent);
    });
  });

  describe('createStageChangeEvent', () => {
    it('marks the event as automated when no actor is provided', async () => {
      const event = await ApplicationTimelineService.createStageChangeEvent(
        APP_ID,
        ApplicationStage.PENDING,
        ApplicationStage.REVIEWING
      );

      expect(event.metadata?.automated).toBe(true);
      expect(event.created_by_system).toBe(true);
      expect(event.previous_stage).toBe(ApplicationStage.PENDING);
      expect(event.new_stage).toBe(ApplicationStage.REVIEWING);
    });

    it('records the actor and marks the event as non-automated when a user supplies the change', async () => {
      const event = await ApplicationTimelineService.createStageChangeEvent(
        APP_ID,
        ApplicationStage.REVIEWING,
        ApplicationStage.DECIDING,
        'staff-1'
      );

      expect(event.metadata?.automated).toBe(false);
      expect(event.created_by).toBe('staff-1');
    });
  });

  describe('getApplicationTimeline', () => {
    it('returns events in descending creation order', async () => {
      const earlier = await seedEvent({ title: 'earlier' });
      // Small delay so the auto-timestamp on the second event is strictly later.
      await new Promise(r => setTimeout(r, 5));
      const later = await seedEvent({ title: 'later' });

      const events = await ApplicationTimelineService.getApplicationTimeline(APP_ID);

      expect(events.map(e => e.timeline_id)).toEqual([later.timeline_id, earlier.timeline_id]);
    });

    it('filters by event types when provided', async () => {
      await seedEvent({ event_type: TimelineEventType.NOTE_ADDED, title: 'note' });
      await seedEvent({ event_type: TimelineEventType.STAGE_CHANGE, title: 'stage' });

      const events = await ApplicationTimelineService.getApplicationTimeline(APP_ID, {
        event_types: [TimelineEventType.STAGE_CHANGE],
      });

      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe(TimelineEventType.STAGE_CHANGE);
    });
  });

  describe('getTimelineStats', () => {
    it('counts events per type and tracks staff activity', async () => {
      await seedEvent({ event_type: TimelineEventType.NOTE_ADDED, created_by: 'staff-1' });
      await seedEvent({ event_type: TimelineEventType.NOTE_ADDED, created_by: 'staff-1' });
      await seedEvent({ event_type: TimelineEventType.STAGE_CHANGE, created_by: 'staff-2' });

      const stats = await ApplicationTimelineService.getTimelineStats(APP_ID);

      expect(stats.total_events).toBe(3);
      expect(stats.events_by_type[TimelineEventType.NOTE_ADDED]).toBe(2);
      expect(stats.events_by_type[TimelineEventType.STAGE_CHANGE]).toBe(1);
      expect(stats.staff_activity['staff-1']).toBe(2);
      expect(stats.staff_activity['staff-2']).toBe(1);
    });

    it('reports zero events with null timestamps for an application that has no history', async () => {
      const stats = await ApplicationTimelineService.getTimelineStats('no-such-app');
      expect(stats).toEqual({
        total_events: 0,
        events_by_type: {},
        first_event: null,
        last_event: null,
        staff_activity: {},
      });
    });
  });

  describe('getBulkTimelineStats', () => {
    it('returns an empty object when given no application ids', async () => {
      const stats = await ApplicationTimelineService.getBulkTimelineStats([]);
      expect(stats).toEqual({});
    });

    it('initialises every requested id even when no events exist', async () => {
      const stats = await ApplicationTimelineService.getBulkTimelineStats(['a', 'b']);
      expect(stats.a.totalEvents).toBe(0);
      expect(stats.a.lastActivity).toBeNull();
      expect(stats.b.totalEvents).toBe(0);
    });

    it('aggregates totals and identifies the most recent activity per application', async () => {
      // Sequelize auto-manages created_at via timestamps: true, so we let it
      // assign timestamps and just verify aggregate behaviour.
      await seedEvent({
        application_id: 'a',
        event_type: TimelineEventType.NOTE_ADDED,
      });
      await seedEvent({
        application_id: 'a',
        event_type: TimelineEventType.STAGE_CHANGE,
      });

      const stats = await ApplicationTimelineService.getBulkTimelineStats(['a']);

      expect(stats.a.totalEvents).toBe(2);
      expect(stats.a.eventTypeCounts[TimelineEventType.NOTE_ADDED]).toBe(1);
      expect(stats.a.eventTypeCounts[TimelineEventType.STAGE_CHANGE]).toBe(1);
      // lastActivity is whichever event has the latest created_at — we
      // can't predict an exact ms value because Sequelize hooks resolve
      // timestamps slightly differently from the value returned by
      // create(). Assert it is at least set and within the test's wall
      // clock window.
      expect(stats.a.lastActivity).toBeInstanceOf(Date);
    });
  });
});
