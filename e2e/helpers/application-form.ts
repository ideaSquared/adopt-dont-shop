import { expect, type Locator, type Page } from '@playwright/test';

const STEP_STATUS = /^Step \d+ of \d+/;
const DEFAULT_FREE_TEXT = 'We have a quiet home, a garden and plenty of time to give.';

/**
 * The guided apply page can rebuild its form after the first step is already on
 * screen: it reloads whenever the signed-in user object changes, which swaps the
 * form for a spinner and re-seeds every answer. Any tile click made before that
 * point is lost. So a step is never trusted until it is observed:
 *
 *  - each answer is only clicked if it is not already registered, and is then
 *    verified (radio checked / adult counted / field holding the text);
 *  - "Continue" is clicked and the step counter must really move on;
 *  - if a rebuild wiped the answers, the step's required-field validation keeps
 *    it in place, the attempt fails, and only the missing interactions are redone.
 */
async function ensureAnswered(page: Page, freeText: string): Promise<void> {
  const main = page.locator('main');

  for (const group of await main.getByRole('radiogroup').all()) {
    const checked = group.getByRole('radio', { checked: true });
    if ((await checked.count()) === 0) {
      await group.locator('label').first().click();
    }
    await expect(checked).toHaveCount(1, { timeout: 2_000 });
  }

  const addAdult = page.getByRole('button', { name: /adult \+/i });
  if ((await addAdult.count()) > 0) {
    await addAdult.click();
    await expect(addAdult).toHaveCount(0, { timeout: 2_000 });
  }

  for (const field of await main.getByRole('textbox').all()) {
    if ((await field.inputValue()) === '') {
      await field.fill(freeText);
    }
    await expect(field).toHaveValue(freeText, { timeout: 2_000 });
  }
}

async function continueAndWaitForNextStep(
  continueButton: Locator,
  status: Locator,
  stepBefore: string
): Promise<void> {
  await continueButton.click();
  await expect(status).not.toHaveText(stepBefore, { timeout: 4_000 });
}

/**
 * Walk the guided /apply/:petId form the way an adopter would: on each step,
 * pick the first option of every question, add one adult to the household
 * picker, answer every empty free-text question with `freeText`, then continue.
 * Stops on the "Review & send" step without submitting.
 */
export async function answerEveryApplicationStep(
  page: Page,
  freeText: string = DEFAULT_FREE_TEXT
): Promise<void> {
  const status = page.getByText(STEP_STATUS).first();

  for (;;) {
    const continueButton = page.getByRole('button', { name: /continue/i });
    const send = page.getByRole('button', { name: /send my application/i });
    // Wait through the loading spinner for a rendered step: a question step has
    // "Continue", the last one "Send my application".
    await expect(continueButton.or(send)).toBeVisible({ timeout: 20_000 });
    if ((await continueButton.count()) === 0) {
      return;
    }
    const stepBefore = (await status.textContent()) ?? '';
    await expect(async () => {
      await ensureAnswered(page, freeText);
      await continueAndWaitForNextStep(continueButton, status, stepBefore);
    }).toPass({ timeout: 30_000 });
  }
}
