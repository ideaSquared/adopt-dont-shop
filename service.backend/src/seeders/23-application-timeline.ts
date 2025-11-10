import ApplicationTimeline, { TimelineEventType } from '../models/ApplicationTimeline';
import { v4 as uuidv4 } from 'uuid';

const timelineData = [
  // Timeline events for John's application (VISITING stage)
  {
    timeline_id: uuidv4(),
    application_id: 'app_buddy_john_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Application submitted',
    description: 'Application submitted and moved to pending stage',
    created_by_system: true,
    new_stage: 'PENDING',
    created_at: new Date('2024-02-15T10:30:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_buddy_john_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Review started',
    description: 'Staff member began reviewing application',
    created_by: 'user_rescue_admin_001',
    previous_stage: 'PENDING',
    new_stage: 'REVIEWING',
    created_at: new Date('2024-02-16T09:00:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_buddy_john_001',
    event_type: TimelineEventType.REFERENCE_CONTACTED,
    title: 'Reference contacted: Dr. Johnson',
    description: 'Contacted veterinarian Dr. Johnson via phone',
    created_by: 'user_rescue_admin_001',
    metadata: {
      reference_name: 'Dr. Johnson',
      contact_method: 'phone',
      result: 'positive',
    },
    created_at: new Date('2024-02-17T10:30:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_buddy_john_001',
    event_type: TimelineEventType.HOME_VISIT_SCHEDULED,
    title: 'Home visit scheduled',
    description: 'Home visit scheduled for February 20, 2024',
    created_by: 'user_rescue_admin_001',
    metadata: {
      visit_date: '2024-02-20T14:00:00Z',
      staff_member_id: 'user_rescue_admin_001',
    },
    created_at: new Date('2024-02-18T11:00:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_buddy_john_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Moved to visiting stage',
    description: 'Application automatically moved to visiting stage when home visit was scheduled',
    created_by_system: true,
    previous_stage: 'REVIEWING',
    new_stage: 'VISITING',
    created_at: new Date('2024-02-18T11:01:00Z'),
  },

  // Timeline events for Emily's application (RESOLVED - Approved)
  {
    timeline_id: uuidv4(),
    application_id: 'app_whiskers_emily_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Application submitted',
    description: 'Application submitted and moved to pending stage',
    created_by_system: true,
    new_stage: 'PENDING',
    created_at: new Date('2024-02-12T16:20:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_whiskers_emily_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Review started',
    description: 'Staff member began reviewing application',
    created_by: 'user_rescue_admin_001',
    previous_stage: 'PENDING',
    new_stage: 'REVIEWING',
    created_at: new Date('2024-02-13T09:00:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_whiskers_emily_001',
    event_type: TimelineEventType.REFERENCE_CONTACTED,
    title: 'Reference contacted: Dr. Martinez',
    description: 'Contacted veterinarian Dr. Martinez via phone',
    created_by: 'user_rescue_admin_001',
    metadata: {
      reference_name: 'Dr. Martinez',
      contact_method: 'phone',
      result: 'excellent',
    },
    created_at: new Date('2024-02-14T11:00:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_whiskers_emily_001',
    event_type: TimelineEventType.HOME_VISIT_SCHEDULED,
    title: 'Home visit scheduled',
    description: 'Home visit scheduled for February 15, 2024',
    created_by: 'user_rescue_admin_001',
    metadata: {
      visit_date: '2024-02-15T10:00:00Z',
      staff_member_id: 'user_rescue_admin_001',
    },
    created_at: new Date('2024-02-15T10:00:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_whiskers_emily_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Moved to visiting stage',
    description: 'Application automatically moved to visiting stage when home visit was scheduled',
    created_by_system: true,
    previous_stage: 'REVIEWING',
    new_stage: 'VISITING',
    created_at: new Date('2024-02-15T10:01:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_whiskers_emily_001',
    event_type: TimelineEventType.HOME_VISIT_COMPLETED,
    title: 'Home visit completed - positive',
    description: 'Home visit completed successfully. Apartment is perfect for senior cat.',
    created_by: 'user_rescue_admin_001',
    metadata: {
      outcome: 'positive',
      notes: 'Apartment is cat-proofed and has great sunny spots. Very suitable for senior cat.',
    },
    created_at: new Date('2024-02-17T14:00:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_whiskers_emily_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Moved to deciding stage',
    description: 'Application automatically moved to deciding stage after positive home visit',
    created_by_system: true,
    previous_stage: 'VISITING',
    new_stage: 'DECIDING',
    created_at: new Date('2024-02-17T14:01:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_whiskers_emily_001',
    event_type: TimelineEventType.DECISION_MADE,
    title: 'Application approved',
    description: 'Application approved for adoption',
    created_by: 'user_rescue_admin_001',
    metadata: {
      decision: 'approved',
      reason: 'Perfect match for Whiskers. Emily understands senior cat needs perfectly.',
    },
    created_at: new Date('2024-02-20T14:45:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_whiskers_emily_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Application resolved',
    description: 'Application completed with approved outcome',
    created_by_system: true,
    previous_stage: 'DECIDING',
    new_stage: 'RESOLVED',
    created_at: new Date('2024-02-20T14:46:00Z'),
  },

  // Timeline events for Michael's application (REVIEWING stage)
  {
    timeline_id: uuidv4(),
    application_id: 'app_rocky_michael_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Application submitted',
    description: 'Application submitted and moved to pending stage',
    created_by_system: true,
    new_stage: 'PENDING',
    created_at: new Date('2024-02-14T13:45:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_rocky_michael_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Review started',
    description: 'Staff member began reviewing application',
    created_by: 'user_rescue_admin_002',
    previous_stage: 'PENDING',
    new_stage: 'REVIEWING',
    created_at: new Date('2024-02-17T15:00:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_rocky_michael_001',
    event_type: TimelineEventType.NOTE_ADDED,
    title: 'Interview note added',
    description: 'Applicant shows excellent understanding of pit bull breed needs...',
    created_by: 'user_rescue_admin_002',
    metadata: {
      note_type: 'interview',
      full_content:
        'Applicant shows excellent understanding of pit bull breed needs and has specific experience with the breed. Lives alone which is perfect for Rocky who prefers being the only dog.',
    },
    created_at: new Date('2024-02-18T09:15:00Z'),
  },

  // Timeline events for Jessica's application (RESOLVED - Rejected)
  {
    timeline_id: uuidv4(),
    application_id: 'app_luna_jessica_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Application submitted',
    description: 'Application submitted and moved to pending stage',
    created_by_system: true,
    new_stage: 'PENDING',
    created_at: new Date('2024-02-16T20:15:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_luna_jessica_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Review started',
    description: 'Staff member began reviewing application',
    created_by: 'user_rescue_staff_001',
    previous_stage: 'PENDING',
    new_stage: 'REVIEWING',
    created_at: new Date('2024-02-19T09:00:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_luna_jessica_001',
    event_type: TimelineEventType.DECISION_MADE,
    title: 'Application rejected',
    description: 'Application rejected due to insufficient experience for high-energy cat',
    created_by: 'user_rescue_staff_001',
    metadata: {
      decision: 'rejected',
      reason:
        'First-time pet owner not suitable for high-energy cat that needs experienced handling',
    },
    created_at: new Date('2024-02-19T11:30:00Z'),
  },
  {
    timeline_id: uuidv4(),
    application_id: 'app_luna_jessica_001',
    event_type: TimelineEventType.STAGE_CHANGE,
    title: 'Application resolved',
    description: 'Application completed with rejected outcome',
    created_by_system: true,
    previous_stage: 'REVIEWING',
    new_stage: 'RESOLVED',
    created_at: new Date('2024-02-19T11:31:00Z'),
  },
];

export async function seedApplicationTimeline() {
  for (const timelineEvent of timelineData) {
    await ApplicationTimeline.findOrCreate({
      where: { timeline_id: timelineEvent.timeline_id },
      defaults: {
        ...timelineEvent,
        updated_at: new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${timelineData.length} application timeline events`);
}
