import { test, expect, type ApiClient } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { createAvailablePet, getMyRescueId, postWithCsrf } from '../../helpers/seeds';

/**
 * RES-080: a manager places a pet with a foster carer, sees the placement in the
 * list, and ends it. Uses a throwaway pet so the seeded pets are untouched.
 */
type Colleague = { userId: string; email: string };

const startPlacement = async (
  rescueApi: ApiClient,
  petId: string
): Promise<{ fosterUserId: string; placementId: string }> => {
  const rescueId = await getMyRescueId(rescueApi);
  const colleagues = (await (await rescueApi.context.get('/api/v1/staff/colleagues')).json()) as {
    data: Colleague[];
  };
  const foster = colleagues.data.find(person => person.email === 'sarah.johnson@pawsrescue.dev');
  if (!rescueId || !foster) {
    throw new Error('seeded rescue or foster carer not found — run `pnpm db:seed`');
  }
  const created = await postWithCsrf(rescueApi.context, '/api/v1/foster/placements', {
    petId,
    fosterUserId: foster.userId,
    rescueId,
    startDate: new Date('2030-06-15T00:00:00Z').toISOString(),
  });
  expect(created.status()).toBe(201);
  const { data } = (await created.json()) as { data: { placementId: string } };
  return { fosterUserId: foster.userId, placementId: data.placementId };
};

test.describe('foster coordination', () => {
  test('a placement shows in the list, survives a reload and leaves it once ended', async ({
    page,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const { petId } = await createAvailablePet(rescueApi, 'Foster');
    const { placementId } = await startPlacement(rescueApi, petId);

    try {
      await page.goto('/foster');
      await dismissCookieBannerWhenShown(page);

      // The list shows the placement against the pet and the carer, who is named by
      // "First Last <email>" (the pet still appears as its id here, because the pets
      // lookup needs a rescue id the page cannot read — see the second fixme).
      const row = page.getByRole('row', { name: new RegExp(petId) });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Sarah Johnson <sarah.johnson@pawsrescue.dev>');
      await expect(row).toContainText('15/06/2030');

      await page.reload();
      await expect(row).toBeVisible();

      // Ending the placement takes it off the Active list.
      const ended = await postWithCsrf(
        rescueApi.context,
        `/api/v1/foster/placements/${placementId}/end`,
        { outcome: 'return_to_rescue' }
      );
      expect(ended.ok()).toBe(true);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Foster Coordination' })).toBeVisible();
      await expect(row).toBeHidden();
    } finally {
      // Ending twice is harmless; this only matters when an assertion above failed.
      await postWithCsrf(rescueApi.context, `/api/v1/foster/placements/${placementId}/end`, {
        outcome: 'cancelled',
      });
    }
  });

  test('a manager can end a placement from the list', async ({ page, apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const { petId } = await createAvailablePet(rescueApi, 'Foster');
    await startPlacement(rescueApi, petId);

    await page.goto('/foster');
    await dismissCookieBannerWhenShown(page);
    const row = page.getByRole('row', { name: new RegExp(petId) });
    await expect(row).toContainText('active');
    await row.getByRole('button', { name: 'End placement' }).click();
    await page
      .getByRole('dialog', { name: 'End Foster Placement' })
      .getByRole('button', { name: 'Confirm' })
      .click();
    await page
      .getByRole('dialog', { name: 'End foster placement?' })
      .getByRole('button', { name: 'End placement' })
      .click();

    await expect(row).toBeHidden();
  });

  // App bug: the New Placement form's pet and foster-user pickers stay empty
  // ("Loading pets...") because the page reads `user.rescueId`, which GET
  // /api/v1/auth/me does not return, so a manager cannot assign a pet from the
  // UI. Remove the fixme once the pickers load.
  test.fixme('a manager can assign a pet to a foster carer from the form', async ({
    page,
    apiAs,
  }) => {
    const { name } = await createAvailablePet(await apiAs('rescue'), 'Foster');

    await page.goto('/foster');
    await dismissCookieBannerWhenShown(page);
    await page.getByRole('button', { name: 'New Placement' }).click();

    const dialog = page.getByRole('dialog', { name: 'New Foster Placement' });
    await dialog.getByPlaceholder('Search pets by name or breed...').fill(name);
    const petSelect = dialog.getByRole('combobox').first();
    const fosterSelect = dialog.getByRole('combobox').nth(1);
    // The search narrowed the list to this one pet (option 0 is the placeholder).
    await petSelect.selectOption({ index: 1 });
    await fosterSelect.selectOption({ label: 'Sarah Johnson (sarah.johnson@pawsrescue.dev)' });
    await dialog.getByLabel('Start date').fill('2030-06-15');
    await dialog.getByRole('button', { name: 'Create' }).click();

    const row = page.getByRole('row', { name });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Sarah Johnson');
    await expect(row).toContainText('active');
  });
});
