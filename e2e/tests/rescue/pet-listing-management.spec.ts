import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniquePetName } from '../../helpers/factories';
import { getMyRescueId, postWithCsrf } from '../../helpers/seeds';

/**
 * The pet management page lists the rescue's pets with what staff need to see
 * at a glance. It lists pets created through the API with a unique name, so
 * what is asserted is exactly what was put in.
 */
test.describe('rescue pet listing management', () => {
  test('a listed pet shows its name, status, type, size and description', async ({
    page,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const name = uniquePetName('Listed');
    const created = await postWithCsrf(rescueApi.context, '/api/v1/pets', {
      name,
      type: 'cat',
      gender: 'male',
      size: 'small',
      ageGroup: 'young',
      shortDescription: 'Purrs at everyone who walks past.',
      rescueId: await getMyRescueId(rescueApi),
    });
    expect(created.status()).toBe(201);

    await page.goto(`/pets?search=${encodeURIComponent(name)}`);
    await dismissCookieBannerWhenShown(page);

    await expect(page.getByRole('heading', { name: 'Pet Management', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    const card = page
      .getByRole('heading', { name, level: 3 })
      .locator('xpath=ancestor::*[.//input[@type="checkbox"]][1]');
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card.locator('span', { hasText: /^Available$/ })).toBeVisible();
    await expect(card.getByText('Type:').locator('xpath=following-sibling::*[1]')).toHaveText(
      'cat'
    );
    await expect(card.getByText('Size:').locator('xpath=following-sibling::*[1]')).toHaveText(
      'small'
    );
    await expect(card.getByText('Purrs at everyone who walks past.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('the status filter lists only pets in that status', async ({ page, apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const name = uniquePetName('Filtered');
    const created = await postWithCsrf(rescueApi.context, '/api/v1/pets', {
      name,
      type: 'dog',
      gender: 'female',
      size: 'medium',
      ageGroup: 'adult',
      rescueId: await getMyRescueId(rescueApi),
    });
    expect(created.status()).toBe(201);

    // Available: the pet is listed.
    await page.goto(`/pets?search=${encodeURIComponent(name)}&status=available`);
    await dismissCookieBannerWhenShown(page);
    await expect(page.getByRole('heading', { name, level: 3 })).toBeVisible({ timeout: 30_000 });

    // Adopted: it is not, and the page says nothing matched.
    await page.goto(`/pets?search=${encodeURIComponent(name)}&status=adopted`);
    await expect(page.getByRole('heading', { name: 'No pets found' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name, level: 3 })).toBeHidden();
  });
});
