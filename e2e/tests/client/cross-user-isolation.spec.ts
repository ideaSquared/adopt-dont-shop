import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { skipSwipeIntro } from '../../helpers/swipe-intro';
import {
  createPrivateConversation,
  rescueSaysSomethingPrivate,
} from '../../helpers/private-conversation';

/**
 * One adopter cannot read another's application or conversation, even with
 * the exact URL. The page's project default session (the seeded adopter) is
 * "adopter B"; adopter A is a throwaway account that owns the data.
 * Manual QA: CLI-075 and CLI-103.
 */
test.describe('cross-user isolation', () => {
  test("adopter B cannot open adopter A's application", async ({ page, apiAs }) => {
    const adopterA = await loginAccountViaApi(await createVerifiedAdopter('owner'));
    const rescueApi = await apiAs('rescue');
    const { applicationId } = await createPrivateConversation(adopterA, rescueApi);
    await adopterA.dispose();
    const adopterB = await apiAs('adopter');
    await skipSwipeIntro(page);

    const apiRes = await adopterB.context.get(`/api/v1/applications/${applicationId}`);
    expect(apiRes.ok()).toBe(false);
    expect([403, 404]).toContain(apiRes.status());
    expect(await apiRes.text()).not.toContain(applicationId);

    await page.goto(`/applications/${applicationId}`);

    await expect(page.getByRole('alert')).toContainText(/failed to load|not found/i);
    await expect(page.getByRole('heading', { name: 'Application Details' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Message rescue' })).toHaveCount(0);
  });

  test("adopter B cannot open adopter A's conversation", async ({ page, apiAs }) => {
    const adopterA = await loginAccountViaApi(await createVerifiedAdopter('owner'));
    const rescueApi = await apiAs('rescue');
    const { chatId } = await createPrivateConversation(adopterA, rescueApi);
    const secret = await rescueSaysSomethingPrivate(rescueApi, chatId);
    await adopterA.dispose();
    const adopterB = await apiAs('adopter');
    await skipSwipeIntro(page);

    const apiRes = await adopterB.context.get(`/api/v1/chats/${chatId}/messages`);
    expect(apiRes.ok()).toBe(false);
    expect([403, 404]).toContain(apiRes.status());
    expect(await apiRes.text()).not.toContain(secret);

    await page.goto(`/chat/${chatId}`);

    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    await expect(page.getByText(secret)).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: /message input/i })).toHaveCount(0);
  });
});
