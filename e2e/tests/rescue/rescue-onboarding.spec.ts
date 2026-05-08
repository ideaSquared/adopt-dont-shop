import { test, expect } from '../../fixtures';
import { createAvailablePet } from '../../helpers/seeds';

/**
 * Rescue onboarding e2e (ADS-486).
 *
 * The full sign-up → email-verification → first-listing → discovery flow
 * cannot be driven through the UI in CI today: rescue accounts are
 * created by invitation, and the verification step depends on Companies
 * House / Charity Commission live calls that the test environment does
 * not stub end-to-end. Until that surface is testable, this spec covers
 * the post-onboarding contract that adopters depend on:
 *
 *   1. A rescue admin can publish a fresh pet listing.
 *   2. That listing surfaces on the public discovery feed an adopter
 *      sees, joining the existing rescue → adopter discovery path.
 *
 * If/when invite-driven registration becomes scriptable from CI, this
 * spec should be extended to start from `/register` rather than from
 * the seeded rescue fixture.
 */
test.describe('rescue onboarding → first listing visibility', () => {
  test('a published pet appears in the public pets endpoint adopters consume', async ({
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const adopterApi = await apiAs('adopter');

    const pet = await createAvailablePet(rescueApi, 'Onboard');

    // Discovery feeds GET /api/v1/pets — eventually consistent in some
    // environments. Poll up to a few seconds before failing.
    const deadline = Date.now() + 15_000;
    let found = false;
    while (Date.now() < deadline && !found) {
      const res = await adopterApi.context.get('/api/v1/pets', { params: { limit: '100' } });
      if (res.ok()) {
        const body = (await res.json()) as {
          data?: Array<{ petId?: string; pet_id?: string; id?: string }>;
          pets?: Array<{ petId?: string; pet_id?: string; id?: string }>;
        };
        const list = body.data ?? body.pets ?? [];
        found = list.some(
          p => (p.petId ?? p.pet_id ?? p.id) === pet.petId
        );
      }
      if (!found) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    expect(found, 'Newly listed pet did not appear on the adopter discovery feed').toBe(true);
  });
});
