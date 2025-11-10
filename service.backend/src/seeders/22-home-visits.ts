import HomeVisit, { HomeVisitStatus, HomeVisitOutcome } from '../models/HomeVisit';

const homeVisitData = [
  // Emily's completed home visit for Whiskers (based on existing home_visit_notes)
  {
    visit_id: 'visit_emily_whiskers_001',
    application_id: 'app_whiskers_emily_001',
    scheduled_date: '2024-02-19',
    scheduled_time: '14:00',
    assigned_staff: 'Sarah Johnson',
    status: HomeVisitStatus.COMPLETED,
    notes: 'Initial visit to assess home environment for senior cat adoption.',
    outcome: HomeVisitOutcome.APPROVED,
    outcome_notes:
      'Apartment is cat-proofed and has great sunny spots. Very suitable for senior cat. Emily has created an excellent environment with comfortable resting areas, proper safety measures, and understands senior cat care requirements perfectly.',
    reschedule_reason: null,
    cancelled_reason: null,
    completed_at: new Date('2024-02-19T16:30:00Z'),
    created_at: new Date('2024-02-18T10:30:00Z'),
    updated_at: new Date('2024-02-19T16:30:00Z'),
  },

  // John's upcoming home visit for Buddy
  {
    visit_id: 'visit_john_buddy_001',
    application_id: 'app_buddy_john_001',
    scheduled_date: '2024-03-15',
    scheduled_time: '10:00',
    assigned_staff: 'Mike Wilson',
    status: HomeVisitStatus.SCHEDULED,
    notes:
      'Home visit to assess suitability for medium-large dog adoption. Need to check yard security and space.',
    outcome: null,
    outcome_notes: null,
    reschedule_reason: null,
    cancelled_reason: null,
    completed_at: null,
    created_at: new Date('2024-03-10T09:00:00Z'),
    updated_at: new Date('2024-03-10T09:00:00Z'),
  },

  // Additional sample visits for demonstration
  {
    visit_id: 'visit_demo_scheduled_001',
    application_id: 'app_buddy_john_001', // Using John's application for multiple visits demo
    scheduled_date: '2024-03-20',
    scheduled_time: '15:30',
    assigned_staff: 'Lisa Chen',
    status: HomeVisitStatus.SCHEDULED,
    notes: 'Follow-up visit to check additional safety measures discussed in initial consultation.',
    outcome: null,
    outcome_notes: null,
    reschedule_reason: null,
    cancelled_reason: null,
    completed_at: null,
    created_at: new Date('2024-03-12T14:00:00Z'),
    updated_at: new Date('2024-03-12T14:00:00Z'),
  },

  {
    visit_id: 'visit_demo_in_progress_001',
    application_id: 'app_buddy_john_001',
    scheduled_date: '2024-03-14',
    scheduled_time: '13:00',
    assigned_staff: 'Sarah Johnson',
    status: HomeVisitStatus.IN_PROGRESS,
    notes: 'Currently conducting home assessment. Family very prepared.',
    outcome: null,
    outcome_notes: null,
    reschedule_reason: null,
    cancelled_reason: null,
    completed_at: null,
    created_at: new Date('2024-03-12T11:00:00Z'),
    updated_at: new Date('2024-03-14T13:00:00Z'),
  },

  {
    visit_id: 'visit_demo_conditional_001',
    application_id: 'app_buddy_john_001',
    scheduled_date: '2024-03-05',
    scheduled_time: '16:00',
    assigned_staff: 'Mike Wilson',
    status: HomeVisitStatus.COMPLETED,
    notes: 'Home visit completed with some recommendations.',
    outcome: HomeVisitOutcome.CONDITIONAL,
    outcome_notes:
      'Home is suitable but needs minor safety improvements: secure gate latch and remove toxic plants from backyard. Applicant is very willing to make changes. Follow-up visit recommended.',
    reschedule_reason: null,
    cancelled_reason: null,
    completed_at: new Date('2024-03-05T17:45:00Z'),
    created_at: new Date('2024-03-02T10:00:00Z'),
    updated_at: new Date('2024-03-05T17:45:00Z'),
  },

  {
    visit_id: 'visit_demo_cancelled_001',
    application_id: 'app_buddy_john_001',
    scheduled_date: '2024-02-28',
    scheduled_time: '14:30',
    assigned_staff: 'Lisa Chen',
    status: HomeVisitStatus.CANCELLED,
    notes: 'Visit cancelled due to weather conditions.',
    outcome: null,
    outcome_notes: null,
    reschedule_reason: null,
    cancelled_reason: 'Severe weather warning issued. Unsafe driving conditions.',
    completed_at: null,
    created_at: new Date('2024-02-25T16:00:00Z'),
    updated_at: new Date('2024-02-28T08:30:00Z'),
  },

  {
    visit_id: 'visit_demo_rejected_001',
    application_id: 'app_buddy_john_001',
    scheduled_date: '2024-02-15',
    scheduled_time: '10:30',
    assigned_staff: 'Sarah Johnson',
    status: HomeVisitStatus.COMPLETED,
    notes: 'Initial home assessment completed.',
    outcome: HomeVisitOutcome.REJECTED,
    outcome_notes:
      'Unfortunately, the home environment is not suitable for a large dog. Yard is too small and not properly secured. Additionally, discovered undisclosed aggressive dog on property. Safety concerns for potential adoptee.',
    reschedule_reason: null,
    cancelled_reason: null,
    completed_at: new Date('2024-02-15T12:00:00Z'),
    created_at: new Date('2024-02-12T14:00:00Z'),
    updated_at: new Date('2024-02-15T12:00:00Z'),
  },
];

export async function seedHomeVisits(): Promise<void> {
  // Drop and recreate the table with correct schema
  await HomeVisit.drop({ cascade: true });
  await HomeVisit.sync({ force: true });

  // Insert new home visits data
  await HomeVisit.bulkCreate(homeVisitData);
}

// Export data for other seeders if needed
export { homeVisitData };

export default seedHomeVisits;
