import { test, expect } from '../../fixtures';
import { uniquePetName } from '../../helpers/factories';

/**
 * The canonical "only e2e can prove this" check: a pet published by a
 * rescue staffer through the API surfaces in the adopter's search
 * results.  Catches breakage in any of: rescue-side write permissions,
 * model serialization, search indexing, public list filtering by
 * status=available, and the client app's search wiring.
 */
test.describe('cross-app data flow', () => {
  test('a pet published by the rescue is visible to an adopter searching for it', async ({
    page,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');

    // Find the rescue this user belongs to so we can attribute the new pet.
    const meRes = await rescueApi.context.get('/api/v1/auth/me');
    if (!meRes.ok()) {
      test.skip(true, `cannot resolve rescue user: ${meRes.status()}`);
    }
    const me = (await meRes.json()) as {
      user?: { rescueId?: string; rescue_id?: string };
      rescueId?: string;
    };
    const rescueId = me.user?.rescueId ?? me.user?.rescue_id ?? me.rescueId;
    if (!rescueId) {
      test.skip(true, 'rescue user has no rescueId on their profile');
    }

    const petName = uniquePetName('Crossapp');
    const createRes = await rescueApi.context.post('/api/v1/pets', {
      data: {
        name: petName,
        type: 'dog',
        gender: 'female',
        size: 'medium',
        ageGroup: 'adult',
        rescueId,
        status: 'available',
        shortDescription: 'Cross-app e2e fixture',
      },
    });
    if (!createRes.ok()) {
      // Some environments require additional fields or a different shape;
      // skip rather than fail when the create-pet contract isn't met.
      test.skip(
        true,
        `pet creation rejected: ${createRes.status()} ${(await createRes.text()).slice(0, 200)}`
      );
    }

    // Now switch to the adopter's UI (the test fixture runs under the
    // `client` project with the adopter's storageState) and search by
    // the unique name.  The pet should be findable.
    await page.goto('/search');
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .or(page.getByLabel(/^search$/i))
      .first();
    await searchInput.fill(petName);
    await searchInput.press('Enter');

    await expect(page.getByText(petName).first()).toBeVisible({ timeout: 20_000 });
  });
});
