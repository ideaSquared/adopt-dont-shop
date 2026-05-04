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
import Pet, { PetStatus } from '../models/Pet';
import UserFavorite from '../models/UserFavorite';
import UserNotificationPrefs from '../models/UserNotificationPrefs';

// Anchor IDs — kept stable so the e2e specs can address them directly
// when the test only needs to read one specific fixture.
const JOHN_SMITH_ID = '98915d9e-69ed-46b2-a897-57d8469ff360';
const PAWS_RESCUE_ID = '550e8400-e29b-41d4-a716-446655440001';

const E2E_ADOPTED_PET_ID = 'e2e0a000-0000-4000-8000-000000000001';
const E2E_ON_HOLD_PET_ID = 'e2e0a000-0000-4000-8000-000000000002';

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

  // 3. Favourite an existing seeded available pet for John Smith so the
  //    favourites page has at least one entry.  Pet 9ff5...4b78 is the
  //    first available pet in 08-pets.ts.
  await UserFavorite.findOrCreate({
    paranoid: false,
    where: { userId: JOHN_SMITH_ID, petId: '9ff53898-c5c6-4422-a245-54e52d4c4b78' },
    defaults: {
      id: generateUuidV7(),
      userId: JOHN_SMITH_ID,
      petId: '9ff53898-c5c6-4422-a245-54e52d4c4b78',
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

  // eslint-disable-next-line no-console
  console.log('✅ E2E fixtures seeded (adopted pet, on-hold pet, favourite, notification prefs)');
}
