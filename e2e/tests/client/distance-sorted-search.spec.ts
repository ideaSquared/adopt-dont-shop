import { test, expect } from '../../fixtures';
import { gotoSearch } from '../../helpers/pet';

test.describe('search filters', () => {
  test('applying a distance/location filter changes the result set', async ({ page }) => {
    await gotoSearch(page);

    const initialCards = page.getByRole('article').or(page.locator('[data-testid="pet-card"]'));
    const before = await initialCards.count();

    const distanceFilter = page
      .getByLabel(/distance|radius|within/i)
      .or(page.getByRole('combobox', { name: /distance|radius/i }))
      .first();

    if (!(await distanceFilter.count())) {
      test.skip(true, 'distance filter not exposed in this build');
    }

    // Pick a tight radius likely to reduce result count.
    await distanceFilter.click();
    const tight = page.getByRole('option', { name: /(5|10|20).*(km|mi)/i }).first();
    if (await tight.count()) {
      await tight.click();
    } else {
      await distanceFilter.fill('10');
    }

    await expect.poll(async () => initialCards.count(), { timeout: 10_000 }).not.toBe(before);
  });
});
