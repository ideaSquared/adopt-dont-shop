import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import {
  openOnlyConversation,
  rescueOpensChatForApplication,
} from '../../helpers/application-chat';
import { answerEveryApplicationStep } from '../../helpers/application-form';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { openRoleContext } from '../../helpers/cross-app-sessions';
import { uniqueEmail, uniqueText } from '../../helpers/factories';
import { createAvailablePet } from '../../helpers/seeds';
import { skipSwipeIntro } from '../../helpers/swipe-intro';
import { peekAuthTokens } from '../../helpers/token-peek';
import { URLS } from '../../playwright.config';

const PASSWORD = 'BehaviourTest123!';

async function send(page: Page, text: string): Promise<void> {
  const input = page.getByRole('textbox', { name: /message input/i });
  await input.fill(text);
  await input.press('Enter');
}

/**
 * X-001: the full adoption journey across the client and rescue apps. A brand
 * new adopter registers, verifies the emailed link, signs in, applies for a
 * pet, the rescue approves the application in its own app, the adopter sees
 * "Approved", and the two sides exchange chat messages.
 */
test.describe('X-001 full adoption journey', () => {
  test('a new adopter registers, applies, is approved by the rescue and chats with them', async ({
    browser,
    apiAs,
  }) => {
    // Seven steps across two apps: well past the 60s default.
    test.setTimeout(180_000);
    const rescueApi = await apiAs('rescue');
    const pet = await createAvailablePet(rescueApi, 'X001');
    const email = uniqueEmail('x001');

    const adopterContext = await browser.newContext({
      baseURL: URLS.client,
      storageState: { cookies: [], origins: [] },
    });
    const rescueContext = await openRoleContext(browser, 'rescue');
    try {
      const adopter = await adopterContext.newPage();
      await skipSwipeIntro(adopter);
      await dismissCookieBannerPatiently(adopter);

      // 1) Client: register through the form.
      await adopter.goto('/register');
      await adopter.getByRole('textbox', { name: 'First Name*' }).fill('Journey');
      await adopter.getByRole('textbox', { name: 'Last Name*' }).fill('Adopter');
      await adopter.getByRole('textbox', { name: 'Email Address*' }).fill(email);
      await adopter.getByRole('textbox', { name: 'Password*', exact: true }).fill(PASSWORD);
      await adopter.getByRole('textbox', { name: 'Confirm Password*' }).fill(PASSWORD);
      await adopter.getByRole('checkbox', { name: /terms of service/i }).check();
      await adopter.getByRole('button', { name: 'Create Account' }).click();
      await expect(adopter).toHaveURL(/\/check-your-email/, { timeout: 15_000 });

      // 2) Client: follow the emailed verification link (token read via the
      // test-only peek seam instead of an inbox).
      await expect
        .poll(async () => (await peekAuthTokens(email)).verificationToken, { timeout: 15_000 })
        .not.toBeNull();
      const { verificationToken } = await peekAuthTokens(email);
      await adopter.goto(`/verify-email?token=${verificationToken}`);
      await expect(adopter.getByRole('heading', { name: 'Email Verified!' })).toBeVisible({
        timeout: 15_000,
      });

      // 3) Client: sign in with the verified account.
      await loginViaUI(adopter, email, PASSWORD);
      await adopter.goto('/profile');
      await expect(
        adopter.getByRole('button', { name: /user menu for Journey Adopter/i })
      ).toBeVisible({ timeout: 15_000 });

      // 4) Client: open the pet and send an application through the form.
      await adopter.goto(`/pets/${pet.petId}`);
      await adopter
        .getByRole('link', { name: /apply (to|for) adopt/i })
        .or(adopter.getByRole('button', { name: /apply (to|for) adopt/i }))
        .first()
        .click();
      await expect(adopter).toHaveURL(new RegExp(`/apply/${pet.petId}`));
      await answerEveryApplicationStep(adopter);
      await adopter.getByRole('checkbox', { name: /references have agreed/i }).check();
      await adopter.getByRole('button', { name: /send my application/i }).click();
      await expect(adopter.getByRole('heading', { name: /application sent/i })).toBeVisible({
        timeout: 20_000,
      });

      // 5) Rescue: the application is in the inbox; start a review and approve.
      const rescue = await rescueContext.newPage();
      await dismissCookieBannerPatiently(rescue);
      await rescue.goto('/applications');
      const row = rescue.getByRole('row').filter({ hasText: pet.name });
      await expect(row).toBeVisible({ timeout: 20_000 });
      await row.getByRole('button', { name: 'View' }).click();

      const transition = async (action: RegExp, choice?: string) => {
        await rescue.getByRole('button', { name: 'Transition Stage' }).click();
        await rescue.getByRole('button', { name: action }).click();
        if (choice) {
          await rescue.getByRole('button', { name: choice, exact: true }).click();
        }
        await rescue.getByRole('button', { name: 'Confirm Transition' }).click();
        await expect(
          rescue.getByRole('heading', { name: 'Transition Application Stage' })
        ).toBeHidden();
      };
      await transition(/begin reviewing/i);
      await transition(/make the final approval/i, 'Approve');
      await expect(row.getByRole('cell', { name: 'Approved', exact: true })).toBeVisible({
        timeout: 15_000,
      });

      // 6) Client: My Applications now shows the same decision.
      await adopter.goto('/applications');
      await expect(adopter.getByRole('heading', { level: 3, name: pet.name })).toBeVisible({
        timeout: 15_000,
      });
      await expect(adopter.getByText('Approved', { exact: true })).toBeVisible({ timeout: 15_000 });

      // 6b) Client: the decision also reached the adopter's notifications.
      await adopter.goto('/notifications');
      await expect(adopter.getByText('Application approved!')).toBeVisible({ timeout: 20_000 });

      // 7) The rescue opens a chat about the application; the two talk in it.
      await rescueOpensChatForApplication(rescueApi, adopterContext, pet.petId);
      await openOnlyConversation(adopter);
      const question = uniqueText('When can we meet her?');
      await send(adopter, question);
      await expect(adopter.getByRole('article').filter({ hasText: question })).toBeVisible();

      await rescue.goto('/communication');
      await rescue.locator('main').getByRole('button').filter({ hasText: question }).click();
      await expect(rescue.getByRole('article').filter({ hasText: question })).toBeVisible({
        timeout: 15_000,
      });
      const reply = uniqueText('Saturday morning suits us');
      await send(rescue, reply);

      // No reload: the reply reaches the adopter over the socket.
      await expect(adopter.getByRole('article').filter({ hasText: reply })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await adopterContext.close();
      await rescueContext.close();
    }
  });
});
