import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { answerEveryApplicationStep } from '../../helpers/application-form';
import { loginViaUI } from '../../helpers/auth';
import { createAvailablePet } from '../../helpers/seeds';

/**
 * The adoption application, end to end through the adopter's UI: open a pet,
 * apply, answer the rescue's questionnaire step by step, send it, and find it
 * on My Applications.
 *
 * adoption-application.spec.ts submits through the API, so it could not see
 * that the form had no questions to show (the core questionnaire was never
 * seeded), that adopters were refused the questionnaire, or that the success
 * screen never appeared. This spec drives every one of those steps in the
 * browser.
 *
 * A fresh adopter keeps the run independent of John Smith: a submission
 * saves the adopter's answers as defaults, which switches their next form to
 * Quick Apply.
 */
test.describe('applying for a pet through the UI', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('an adopter answers the questionnaire, sends it, and sees it on My Applications @smoke', async ({
    page,
    apiAs,
  }) => {
    const { petId, name: petName } = await createAvailablePet(await apiAs('rescue'), 'ApplyUi');
    const adopter = await createVerifiedAdopter('apply-ui');

    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenSwipeOnboarding', 'true');
    });
    await loginViaUI(page, adopter.email, adopter.password);

    await page.goto(`/pets/${petId}`);
    await page
      .getByRole('link', { name: /apply (to|for) adopt/i })
      .or(page.getByRole('button', { name: /apply (to|for) adopt/i }))
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/apply/${petId}`));

    await answerEveryApplicationStep(page);

    await expect(page.getByRole('heading', { name: /one last look/i })).toBeVisible();
    const send = page.getByRole('button', { name: /send my application/i });
    await expect(send).toBeDisabled();
    await page.getByRole('checkbox', { name: /references have agreed/i }).check();
    await send.click();

    await expect(page.getByRole('heading', { name: /application sent/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto('/applications');
    await expect(page.getByRole('heading', { level: 1, name: /my applications/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(petName).first()).toBeVisible({ timeout: 15_000 });
  });
});
