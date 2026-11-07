import { expect, type BrowserContext, type Page } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { URLS } from '../playwright.config';
import { expectOk, postWithCsrf } from './seeds';

type ApplicationRow = { id: string; petId: string; userId: string };

/**
 * The rescue opens a chat with the adopter signed in on `adopterContext`, about
 * their application for `petId` (the same call the rescue app makes).
 *
 * The adopter's own "Message rescue" button goes through the pet-enquiry route,
 * which the gateway caps at 10 a day per source IP, and every spec on the
 * shared stack comes from one IP, so journeys that only need *a* conversation
 * use this instead of spending that allowance.
 */
export async function rescueOpensChatForApplication(
  rescueApi: ApiClient,
  adopterContext: BrowserContext,
  petId: string
): Promise<string> {
  const listed = await adopterContext.request.get(`${URLS.api}/api/v1/applications`);
  await expectOk(listed, "list the adopter's applications");
  const { data: applications } = (await listed.json()) as { data: ApplicationRow[] };
  const application = applications.find(a => a.petId === petId);
  if (!application) {
    throw new Error(`the adopter has no application for pet ${petId}`);
  }

  const openRes = await postWithCsrf(rescueApi.context, '/api/v1/chats', {
    applicationId: application.id,
    otherUserId: application.userId,
  });
  await expectOk(openRes, 'rescue opens a chat with the applicant');
  const { chat } = (await openRes.json()) as { chat: { chatId: string } };
  return chat.chatId;
}

/**
 * Open the signed-in adopter's one conversation from the chat list and wait
 * for its message box. Only use it for an adopter with a single chat.
 */
export async function openOnlyConversation(page: Page): Promise<void> {
  await page.goto('/chat');
  await page
    .locator('main')
    .getByRole('button', { name: /rescue organization/i })
    .first()
    .click();
  await expect(page.getByRole('textbox', { name: /message input/i })).toBeVisible({
    timeout: 15_000,
  });
}
