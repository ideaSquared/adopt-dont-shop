import { test, expect } from '../../fixtures';
import {
  expectApplicationConfirmation,
  fillApplicationForm,
  gotoMyApplications,
  submitApplication,
  validApplicationData,
} from '../../helpers/application';
import { openFirstPet } from '../../helpers/pet';

test.describe('adoption application submission', () => {
  test('an adopter can submit an application and see it in their dashboard', async ({ page }) => {
    await page.goto('/discover');
    await openFirstPet(page);
    const petName = (await page.getByRole('heading').first().textContent())?.trim() ?? '';

    await page
      .getByRole('button', { name: /apply (to|for) adopt/i })
      .first()
      .click();

    await fillApplicationForm(page, validApplicationData());
    await submitApplication(page);
    await expectApplicationConfirmation(page);

    await gotoMyApplications(page);
    if (petName) {
      await expect(page.getByText(petName).first()).toBeVisible({ timeout: 15_000 });
    } else {
      const cards = page.getByRole('article').or(page.locator('[data-testid="application-card"]'));
      await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    }
  });
});
