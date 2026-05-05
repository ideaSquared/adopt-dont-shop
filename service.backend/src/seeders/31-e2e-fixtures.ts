/**
 * E2E test fixtures: small set of records the Playwright suite reads,
 * scoped to John Smith (the seeded adopter) and Pawsitive Rescue (the
 * seeded rescue).  Idempotent: every record uses findOrCreate keyed on
 * the same UUID across runs.
 *
 * If you change a fixture here, also update the corresponding e2e spec
 * that relies on it.  See e2e/README.md for the contract.
 */
import { generateUuidV7 } from '../utils/uuid';
import ChatParticipant from '../models/ChatParticipant';
import Pet, { PetStatus } from '../models/Pet';
import UserFavorite from '../models/UserFavorite';
import UserNotificationPrefs from '../models/UserNotificationPrefs';
import { ParticipantRole } from '../types/chat';

// Anchor IDs — kept stable so the e2e specs can address them directly
// when the test only needs to read one specific fixture.
const JOHN_SMITH_ID = '98915d9e-69ed-46b2-a897-57d8469ff360';
const RESCUE_MANAGER_ID = '3d7065c5-82a3-4bba-a84e-78229365badd';
const PAWS_RESCUE_ID = '550e8400-e29b-41d4-a716-446655440001';

const E2E_ADOPTED_PET_ID = 'e2e0a000-0000-4000-8000-000000000001';
const E2E_ON_HOLD_PET_ID = 'e2e0a000-0000-4000-8000-000000000002';

// Chat seeded by 10-chats.ts and tied to John's first application.  The
// chat row is created there but with no chat_participants — without the
// participant rows the API rejects messages with "User is not a
// participant in this chat".
const SEEDED_CHAT_ID = '7dfe4c51-930a-443b-aac5-3e42750a2f1a';

export async function seedE2EFixtures() {
  // 1. A pet in 'adopted' status so cannot-apply-to-unavailable-pet has
  //    a deterministic target.
  await Pet.findOrCreate({
    paranoid: false,
    where: { petId: E2E_ADOPTED_PET_ID },
    defaults: {
      petId: E2E_ADOPTED_PET_ID,
      name: 'E2E Adopted Buddy',
      type: 'dog',
      gender: 'male',
      size: 'medium',
      ageGroup: 'adult',
      status: PetStatus.ADOPTED,
      rescueId: PAWS_RESCUE_ID,
      shortDescription: 'E2E fixture: adopted pet for availability-gating tests',
      ageYears: 4,
      ageMonths: 0,
    } as never,
  });

  // 2. A pet in 'not_available' status as a second non-available option.
  await Pet.findOrCreate({
    paranoid: false,
    where: { petId: E2E_ON_HOLD_PET_ID },
    defaults: {
      petId: E2E_ON_HOLD_PET_ID,
      name: 'E2E Not-Available Daisy',
      type: 'cat',
      gender: 'female',
      size: 'small',
      ageGroup: 'young',
      status: PetStatus.NOT_AVAILABLE,
      rescueId: PAWS_RESCUE_ID,
      shortDescription: 'E2E fixture: not-available pet',
      ageYears: 1,
      ageMonths: 6,
    } as never,
  });

  // 3. Favourites for John Smith — TWO entries so the unfavourite test
  //    can delete one without leaving the favourites page empty for
  //    the read test.
  await UserFavorite.findOrCreate({
    paranoid: false,
    where: { userId: JOHN_SMITH_ID, petId: '9ff53898-c5c6-4422-a245-54e52d4c4b78' },
    defaults: {
      id: generateUuidV7(),
      userId: JOHN_SMITH_ID,
      petId: '9ff53898-c5c6-4422-a245-54e52d4c4b78',
    } as never,
  });
  await UserFavorite.findOrCreate({
    paranoid: false,
    where: { userId: JOHN_SMITH_ID, petId: '756ac9c5-ac22-49eb-a21d-8385d525e6de' },
    defaults: {
      id: generateUuidV7(),
      userId: JOHN_SMITH_ID,
      petId: '756ac9c5-ac22-49eb-a21d-8385d525e6de',
    } as never,
  });

  // 4. Notification preferences for John Smith so the prefs API returns
  //    a row to read/update without a first-time provisioning step.
  await UserNotificationPrefs.findOrCreate({
    where: { user_id: JOHN_SMITH_ID },
    defaults: {
      user_id: JOHN_SMITH_ID,
      email_enabled: true,
      push_enabled: true,
      sms_enabled: false,
      application_updates: true,
      pet_matches: true,
      rescue_updates: true,
      chat_messages: true,
      timezone: 'UTC',
    } as never,
  });

  // 5. Chat participants for the seeded chat (John Smith + the rescue
  //    manager).  The 10-chats.ts seeder creates the chat row but no
  //    participants; without these the chat-message API rejects with
  //    403 "User is not a participant in this chat".
  await ChatParticipant.findOrCreate({
    paranoid: false,
    where: { chat_id: SEEDED_CHAT_ID, participant_id: JOHN_SMITH_ID },
    defaults: {
      chat_id: SEEDED_CHAT_ID,
      participant_id: JOHN_SMITH_ID,
      role: ParticipantRole.USER,
    } as never,
  });
  await ChatParticipant.findOrCreate({
    paranoid: false,
    where: { chat_id: SEEDED_CHAT_ID, participant_id: RESCUE_MANAGER_ID },
    defaults: {
      chat_id: SEEDED_CHAT_ID,
      participant_id: RESCUE_MANAGER_ID,
      role: ParticipantRole.RESCUE,
    } as never,
  });

  // eslint-disable-next-line no-console
  console.log('✅ E2E fixtures seeded (pets, favourite, prefs, chat participants)');
}
