import { expect, type Page } from '@playwright/test';

export type ApplicationData = {
  livingSituation?: string;
  experience?: string;
  reason?: string;
};

export const validApplicationData = (): Required<ApplicationData> => ({
  livingSituation: 'Owned house with a fenced garden, no other pets currently.',
  experience: 'Grew up with two rescue dogs; familiar with crate training and vet routines.',
  reason: 'Looking to give a rescue pet a loving permanent home.',
});

/**
 * Fills as many of the "common" application questions as we can find by label.
 * Behaviour-focused: the test asserts on the confirmation outcome, not on
 * which precise field was rendered, so unknown fields are skipped silently.
 */
export async function fillApplicationForm(page: Page, data: ApplicationData): Promise<void> {
  const tryFill = async (labelPattern: RegExp, value: string | undefined) => {
    if (!value) {
      return;
    }
    const field = page.getByLabel(labelPattern).first();
    if (await field.count()) {
      await field.fill(value);
    }
  };

  await tryFill(/living situation|housing|home (type|description)/i, data.livingSituation);
  await tryFill(/experience|previous pets/i, data.experience);
  await tryFill(/why|reason|motivation/i, data.reason);
}

export async function submitApplication(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /(submit|send) application/i })
    .first()
    .click();
}

export async function expectApplicationConfirmation(page: Page): Promise<void> {
  await expect(page.getByText(/application (submitted|received|sent)/i).first()).toBeVisible({
    timeout: 15_000,
  });
}

export async function gotoMyApplications(page: Page): Promise<void> {
  await page.goto('/applications');
  await expect(page).toHaveURL(/\/applications/);
}
