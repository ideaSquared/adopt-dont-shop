import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniqueText } from '../../helpers/factories';
import { getMyRescueId, putWithCsrf } from '../../helpers/seeds';

/**
 * RES-050: a manager edits the rescue profile; the change survives a reload and
 * is what adopters are served for that rescue.
 *
 * It edits the shared seeded rescue, so the original profile is always put back.
 * The website field is left alone: the API cannot clear it again once set.
 */
type RescueView = {
  name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  website: string | null;
  description: string | null;
};

const toProfileBody = (view: RescueView) => ({
  name: view.name,
  email: view.email,
  phone: view.phone ?? '',
  website: view.website ?? '',
  description: view.description ?? '',
  address: {
    street: view.address,
    city: view.city,
    county: view.county ?? '',
    postcode: view.postcode,
    country: view.country,
  },
});

test.describe('editing the rescue profile', () => {
  test('saved changes persist and are served to adopters', async ({ page, apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const rescueId = await getMyRescueId(rescueApi);
    if (!rescueId) {
      throw new Error('could not resolve the rescue manager’s rescue');
    }
    const original = (await (
      await rescueApi.context.get(`/api/v1/rescues/${rescueId}`)
    ).json()) as { data: RescueView };

    const description = uniqueText('We rehome dogs and cats');
    const phone = '020 7946 0321';

    try {
      await page.goto('/settings');
      await dismissCookieBannerWhenShown(page);
      await page.getByLabel('Phone Number').fill(phone);
      await page.getByLabel('Description').fill(description);
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByText('Rescue details saved')).toBeVisible();

      await page.reload();
      await expect(page.getByLabel('Description')).toHaveValue(description);
      await expect(page.getByLabel('Phone Number')).toHaveValue(phone);

      // What an adopter is served for this rescue (the data its public page renders).
      const adopterApi = await apiAs('adopter');
      const publicView = (await (
        await adopterApi.context.get(`/api/v1/rescues/${rescueId}`)
      ).json()) as { data: RescueView };
      expect(publicView.data.description).toBe(description);
      expect(publicView.data.phone).toBe(phone);
    } finally {
      const restored = await putWithCsrf(
        rescueApi.context,
        `/api/v1/rescues/${rescueId}`,
        toProfileBody(original.data)
      );
      expect(restored.ok()).toBe(true);
    }
  });
});

test.describe('public rescue page', () => {
  // App bug: client /rescues/:id shows "Rescue Not Found" for the seeded rescue
  // because lib.rescue's RescueAPIResponseSchema rejects the null county/website
  // the API returns. Remove the fixme once the schema accepts nulls.
  test.fixme('an adopter can open the rescue page and see its details', async ({
    apiAs,
    asRole,
  }) => {
    const rescueId = await getMyRescueId(await apiAs('rescue'));
    const adopterPage = await asRole('adopter');
    await adopterPage.addLocatorHandler(
      adopterPage.getByRole('button', { name: 'Maybe Later' }),
      button => button.click()
    );

    await adopterPage.goto(`/rescues/${rescueId}`);

    await expect(adopterPage.getByRole('heading', { name: 'Paws Rescue', level: 1 })).toBeVisible();
  });
});
