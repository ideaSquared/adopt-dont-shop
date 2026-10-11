import { expect, type Page } from '@playwright/test';

const STEP_STATUS = /^Step \d+ of \d+/;

/**
 * Walk the guided /apply/:petId form the way an adopter would: on each step,
 * pick the first option of every question, add one adult to the household
 * picker, answer every empty free-text question, then continue. Stops on the
 * "Review & send" step without submitting.
 */
export async function answerEveryApplicationStep(page: Page): Promise<void> {
  const main = page.locator('main');
  const status = page.getByText(STEP_STATUS).first();
  await expect(status).toBeVisible({ timeout: 20_000 });

  for (;;) {
    const continueButton = page.getByRole('button', { name: /continue/i });
    if ((await continueButton.count()) === 0) {
      return;
    }
    for (const group of await main.getByRole('radiogroup').all()) {
      await group.locator('label').first().click();
    }
    const addAdult = page.getByRole('button', { name: /adult \+/i });
    if ((await addAdult.count()) > 0) {
      await addAdult.click();
    }
    for (const field of await main.getByRole('textbox').all()) {
      if ((await field.inputValue()) === '') {
        await field.fill('We have a quiet home, a garden and plenty of time to give.');
      }
    }
    const stepBefore = await status.textContent();
    await continueButton.click();
    await expect(status).not.toHaveText(stepBefore ?? '');
  }
}
