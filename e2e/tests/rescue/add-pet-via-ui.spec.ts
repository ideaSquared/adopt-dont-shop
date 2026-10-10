import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniquePetName } from '../../helpers/factories';

/**
 * A rescue lists a new pet through the rescue app's "Add New Pet" form and an
 * adopter can open it in the client app.
 *
 * rescue-onboarding.spec.ts creates pets through the API with an explicit
 * rescueId, so it never saw that the form's request — which carries no
 * rescueId — was rejected with "rescue_id is required".
 */
test.describe('adding a pet in the rescue app', () => {
  test('staff add a pet with just a name and adopters can see it @smoke', async ({
    page,
    asRole,
  }) => {
    const name = uniquePetName('UiListed');

    await page.goto('/pets');
    await dismissCookieBannerWhenShown(page);
    await page.getByRole('button', { name: 'Add New Pet' }).click();

    await page.getByRole('textbox', { name: 'Pet Name *' }).fill(name);
    await page.getByRole('textbox', { name: 'Short Description' }).fill('Loves long walks.');
    const created = page.waitForResponse(
      res => res.url().endsWith('/api/v1/pets') && res.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Add Pet', exact: true }).click();

    const response = await created;
    expect(response.status()).toBe(201);
    const { data: pet } = (await response.json()) as { data: { pet_id: string } };
    await expect(page.getByRole('heading', { name, level: 3 })).toBeVisible({ timeout: 15_000 });

    const adopterPage = await asRole('adopter');
    await adopterPage.goto(`/pets/${pet.pet_id}`);
    await expect(adopterPage.getByRole('heading', { name, level: 1 })).toBeVisible({
      timeout: 20_000,
    });
  });
});
