import { test, expect } from '../../fixtures';
import { ROLES, SECONDARY_USERS } from '../../fixtures/roles';
import type { ApiClient } from '../../fixtures/api';
import { loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { petCardLocator } from '../../helpers/pet';
import { createAvailablePet, expectOk } from '../../helpers/seeds';
import { skipSwipeIntro } from '../../helpers/swipe-intro';

// Paws Rescue (M1 2WD, Manchester) and Happy Tails Rescue (BS1 4DJ, Bristol) are seeded with
// real postcodes, about 140 miles apart, so which one is "near" depends on where the caller is.
const MANCHESTER = '53.4808,-2.2426';
const BRISTOL = '51.4545,-2.5879';
const NEAR_MILES = 5;
const FAR_MILES = 100;

type PetView = { rescue_id: string; distance?: number };

const rescueIdByName = async (api: ApiClient, name: string): Promise<string> => {
  const res = await api.context.get('/api/v1/rescues', { params: { search: name, limit: 50 } });
  await expectOk(res, `find rescue ${name}`);
  const body = (await res.json()) as { data: Array<{ rescue_id: string; name: string }> };
  const rescue = body.data.find(r => r.name === name);
  if (!rescue) {
    throw new Error(`seeded rescue ${name} not found, run pnpm db:seed first`);
  }
  return rescue.rescue_id;
};

/**
 * Adopters only see available pets, and a fresh stack seeds Happy Tails with just one
 * (not_available) pet, so the geometric checks would have nothing to measure. Give each
 * rescue a public, available pet first (Happy Tails through its own director).
 */
const ensurePublicPetForEachRescue = async (rescueApi: ApiClient): Promise<void> => {
  await createAvailablePet(rescueApi, 'DistancePaws');
  const happyTailsApi = await loginAccountViaApi({
    email: SECONDARY_USERS.rescueAdmin2,
    password: ROLES.rescue.password,
    firstName: 'Maria',
  });
  try {
    await createAvailablePet(happyTailsApi, 'DistanceTails');
  } finally {
    await happyTailsApi.dispose();
  }
};

/** Miles from `from` to the rescue, as the gateway reports it on that rescue's pets. */
const distanceTo = async (
  api: ApiClient,
  rescueId: string,
  from: string
): Promise<number | undefined> => {
  const res = await api.context.get('/api/v1/pets', {
    params: { rescueId, limit: 1 },
    headers: { 'x-client-location': from },
  });
  await expectOk(res, 'list a rescue pet with the caller location');
  const body = (await res.json()) as { data: PetView[] };
  return body.data[0]?.distance;
};

test.describe('distance in search', () => {
  // The gateway adds `distance` (miles) to each pet from the x-client-location header.
  // Skipped, not failed, on a stack whose baked proto package predates the rescue
  // location RPC (no pet gets a distance at all): rebuild with pnpm docker:dev:build.
  test('each pet reports its miles from the caller, and nearest flips with the caller', async ({
    apiAs,
  }) => {
    await ensurePublicPetForEachRescue(await apiAs('rescue'));
    const api = await apiAs('adopter');
    const paws = await rescueIdByName(api, 'Paws Rescue');
    const happyTails = await rescueIdByName(api, 'Happy Tails Rescue');

    const pawsFromManchester = await distanceTo(api, paws, MANCHESTER);
    test.skip(
      pawsFromManchester === undefined,
      'gateway returns no pet distances (stale proto build): rebuild the dev image'
    );

    expect(pawsFromManchester).toBeLessThan(NEAR_MILES);
    expect(await distanceTo(api, happyTails, MANCHESTER)).toBeGreaterThan(FAR_MILES);
    expect(await distanceTo(api, happyTails, BRISTOL)).toBeLessThan(NEAR_MILES);
    expect(await distanceTo(api, paws, BRISTOL)).toBeGreaterThan(FAR_MILES);
  });

  // KNOWN APP BUG: "Distance: Nearest First" sends sortBy=distance, but the pets service only
  // sorts by created_at / updated_at / name (SORT_COLUMNS in services/pets/src/grpc/handlers.ts)
  // and silently falls back to created_at, so the list is not in distance order. (On a stack with
  // a stale proto build there are also no distance badges at all.) Remove test.fail when the
  // option really sorts nearest first.
  test.describe('with the adopter in Manchester', () => {
    test.use({
      geolocation: { latitude: 53.4808, longitude: -2.2426 },
      permissions: ['geolocation'],
    });

    test('"Distance: Nearest First" lists the nearest pets first', async ({ page, apiAs }) => {
      test.fail(true, 'sortBy=distance is not a supported sort and falls back to created_at');
      await ensurePublicPetForEachRescue(await apiAs('rescue'));
      const api = await apiAs('adopter');
      const paws = await rescueIdByName(api, 'Paws Rescue');
      const pawsMiles = await distanceTo(api, paws, MANCHESTER);

      await skipSwipeIntro(page);
      await dismissCookieBannerPatiently(page);
      await page.goto('/search');
      await expect(petCardLocator(page).first()).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: 'Use My Location' }).click();
      await expect(page.getByText(/location detected/i)).toBeVisible();

      const sorted = page.waitForResponse(
        res => res.url().includes('/api/v1/pets?') && res.url().includes('sortBy=distance')
      );
      await page.getByRole('combobox', { name: 'Sort by' }).click();
      await page.getByRole('option', { name: 'Distance: Nearest First' }).click();
      await sorted;

      const badges = page.locator('main').getByText(/^[\d.]+ mi$/);
      await expect(badges.first()).toBeVisible({ timeout: 10_000 });
      const miles = (await badges.allTextContents()).map(text => Number.parseFloat(text));
      expect(miles.length).toBeGreaterThan(1);
      // Nearest first: never decreasing, and the first card is as near as Paws Rescue itself.
      expect(miles).toEqual([...miles].sort((a, b) => a - b));
      expect(miles[0]).toBeLessThanOrEqual((pawsMiles ?? 0) + 0.1);
    });
  });
});
