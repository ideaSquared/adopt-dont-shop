import HomeVisit, { HomeVisitStatus, HomeVisitOutcome } from '../models/HomeVisit';

const homeVisitData = [
  // Emily's completed home visit for Whiskers (based on existing home_visit_notes)
  {
    visit_id: 'abdf820c-6848-4945-aaf2-3adf216ead33',
    application_id: '56a2a53c-36c5-41df-af76-96b1a5eb0647',
    scheduled_date: '2024-02-19',
    scheduled_time: '14:00',
    assigned_staff: null,
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
    visit_id: '6d1a5ba7-866a-4c1c-a93f-49024b756f3f',
    application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    scheduled_date: '2024-03-15',
    scheduled_time: '10:00',
    assigned_staff: null,
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
    visit_id: '49218c45-f489-4413-ab2e-d1df5288cd46',
    application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e', // Using John's application for multiple visits demo
    scheduled_date: '2024-03-20',
    scheduled_time: '15:30',
    assigned_staff: null,
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
    visit_id: '4a86eea1-0132-4de2-a372-503998824332',
    application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    scheduled_date: '2024-03-14',
    scheduled_time: '13:00',
    assigned_staff: null,
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
    visit_id: '603879fb-f749-4a0e-a865-bb7138d29bd8',
    application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    scheduled_date: '2024-03-05',
    scheduled_time: '16:00',
    assigned_staff: null,
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
    visit_id: '124e7bef-ef21-4d32-a6c0-b098ae4f8af9',
    application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    scheduled_date: '2024-02-28',
    scheduled_time: '14:30',
    assigned_staff: null,
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
    visit_id: 'e3b9d788-526b-4fd4-aaa2-3ff6979fe254',
    application_id: 'f89c141a-554d-4f6f-adc3-e5d209f5237e',
    scheduled_date: '2024-02-15',
    scheduled_time: '10:30',
    assigned_staff: null,
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
