import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniqueText } from '../../helpers/factories';
import { createAvailablePet } from '../../helpers/seeds';

/**
 * "Ask a question before applying" on a pet page.
 *
 * Every chat used to need an application, so this button always failed. A
 * pet enquiry now opens a chat owned by the pet's rescue as a shared inbox:
 * the rescue manager below was never added to the chat, yet can read and
 * answer it. Asking again reopens the same chat.
 */
async function send(page: Page, text: string): Promise<void> {
  const input = page.getByRole('textbox', { name: /message input/i });
  await input.fill(text);
  await input.press('Enter');
}

async function askAboutPet(page: Page, petId: string): Promise<void> {
  await page.goto(`/pets/${petId}`);
  await page.getByRole('button', { name: 'Ask a question before applying' }).click();
  await expect(page).toHaveURL(/\/chat\/[^/]+$/, { timeout: 15_000 });
}

test.describe('asking a rescue about a pet before applying', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('an adopter asks about a pet and the rescue answers from its shared inbox', async ({
    page,
    apiAs,
    asRole,
  }) => {
    const rescueApi = await apiAs('rescue');
    const pet = await createAvailablePet(rescueApi, 'Enquiry');
    // A fresh adopter: each new enquiry counts towards a per-user daily cap.
    const adopter = await createVerifiedAdopter('enquiry');
    await loginViaUI(page, adopter.email, adopter.password);
    await dismissCookieBannerWhenShown(page);

    await askAboutPet(page, pet.petId);
    const enquiryUrl = page.url();
    const question = uniqueText('Is she good with children?');
    await send(page, question);
    await expect(page.getByRole('article').filter({ hasText: question })).toBeVisible();

    const rescuePage = await asRole('rescue');
    await rescuePage.goto('/communication');
    await dismissCookieBannerWhenShown(rescuePage);
    await rescuePage.locator('main').getByRole('button').filter({ hasText: question }).click();
    await expect(rescuePage.getByRole('article').filter({ hasText: question })).toBeVisible({
      timeout: 15_000,
    });
    const answer = uniqueText('Yes, she grew up with two');
    await send(rescuePage, answer);

    // No reload: the answer reaches the adopter over the socket.
    await expect(page.getByRole('article').filter({ hasText: answer })).toBeVisible({
      timeout: 15_000,
    });

    await askAboutPet(page, pet.petId);
    expect(page.url()).toBe(enquiryUrl);
  });
});
