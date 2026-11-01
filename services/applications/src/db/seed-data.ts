// Canonical dev/e2e application fixtures for the applications.* read model.
//
// This is an event-sourced service: the `applications` table is a projection
// of application_events, and the list/detail reads load each aggregate by
// folding its events. A projection row with no events loads as an empty
// aggregate and is dropped from the list, so seed.ts writes the backing events
// (draftCreated → draftSubmitted → reviewStarted) as well as the projection row.
//
// IDs are pinned to the values the e2e suite + sibling seeds expect:
//   user_id   = John Smith  (services/auth seed; e2e SEEDED_ADOPTER_USER_ID)
//   pet_id    = Buddy        (services/pets seed; available, Paws Rescue)
//   rescue_id = Paws Rescue  (services/{pets,rescue} seeds)

const JOHN_SMITH_USER_ID = '98915d9e-69ed-46b2-a897-57d8469ff360';
const BUDDY_PET_ID = '9ff53898-c5c6-4422-a245-54e52d4c4b78';
const PAWS_RESCUE_ID = 'd0000000-0000-4000-8000-000000000001';
const PAWS_MANAGER_USER_ID = 'b0000000-0000-4000-8000-000000000001'; // services/auth seed

export type SeedApplication = {
  applicationId: string;
  userId: string;
  petId: string;
  rescueId: string;
  // The rescue staffer who moves the application into review.
  reviewerId: string;
  // A non-terminal status so the rescue inbox shows a reviewable row and the
  // adopter dashboard renders a recognisable state.
  status: 'submitted' | 'under_review';
};

export const SEED_APPLICATIONS: readonly SeedApplication[] = [
  {
    applicationId: 'e2eaaaaa-0000-4000-8000-000000000001',
    userId: JOHN_SMITH_USER_ID,
    petId: BUDDY_PET_ID,
    rescueId: PAWS_RESCUE_ID,
    reviewerId: PAWS_MANAGER_USER_ID,
    status: 'under_review',
  },
];
