import { test, expect } from '../../fixtures';
import { URLS } from '../../playwright.config';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniqueText } from '../../helpers/factories';
import { createPrivateConversation } from '../../helpers/private-conversation';
import { skipSwipeIntro } from '../../helpers/swipe-intro';
import { SEEDED_RESCUE_NAME } from '../../helpers/seeds';

/**
 * Whatever an adopter types into the chat is shown back as plain text: markup
 * is not rendered and scripts do not run. Long text and emoji arrive intact.
 * Manual QA: CLI-104.
 */
test.describe('chat message escaping', () => {
  test('html, script payloads, emoji and long text are shown as plain text', async ({
    browser,
    apiAs,
  }) => {
    const account = await createVerifiedAdopter('escape');
    const adopterApi = await loginAccountViaApi(account);
    const rescueApi = await apiAs('rescue');
    await createPrivateConversation(adopterApi, rescueApi);
    await adopterApi.dispose();

    // The project default session is the seeded adopter; sign in as the
    // throwaway one on a clean context.
    const context = await browser.newContext({
      baseURL: URLS.client,
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    const dialogs: string[] = [];
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    // The payloads set window.__xss. A marker set in this document would be lost on
    // reload, so it is checked before the reload as well as after it.
    const payloadRan = () => page.evaluate(() => '__xss' in window);
    try {
      await skipSwipeIntro(page);
      await loginViaUI(page, account.email, account.password);
      await page.goto('/chat');
      await dismissCookieBannerWhenShown(page);
      await page
        .locator('main')
        .getByRole('button', { name: new RegExp(SEEDED_RESCUE_NAME) })
        .first()
        .click();
      const input = page.getByRole('textbox', { name: /message input/i });
      await expect(input).toBeVisible({ timeout: 15_000 });

      const send = async (text: string) => {
        await input.fill(text);
        await input.press('Enter');
        return page.getByRole('article').filter({ hasText: text });
      };

      const tag = uniqueText('tag');
      const html = `<b>bold-${tag}</b> and <i>italic</i>`;
      const htmlMessage = await send(html);
      await expect(htmlMessage).toBeVisible();
      await expect(htmlMessage.locator('b, i')).toHaveCount(0);

      const script = `<script>window.__xss = 1</script><img src=x onerror="window.__xss = 2"> ${tag}`;
      const scriptMessage = await send(script);
      await expect(scriptMessage).toBeVisible();
      await expect(scriptMessage.locator('script, img')).toHaveCount(0);

      const emoji = `Paws & claws 🐶🐱 café "quotes" ${tag}`;
      await expect(await send(emoji)).toBeVisible();

      const long = `${tag} ${'woof '.repeat(200).trim()}`;
      await expect(await send(long)).toBeVisible();

      expect(await payloadRan()).toBe(false);

      // The messages survive a reload as text too.
      await page.reload();
      await page
        .locator('main')
        .getByRole('button', { name: new RegExp(SEEDED_RESCUE_NAME) })
        .first()
        .click();
      await expect(page.getByRole('article').filter({ hasText: html })).toBeVisible({
        timeout: 15_000,
      });

      await expect(page.getByRole('article').filter({ hasText: tag }).first()).toBeVisible();
      expect(dialogs).toEqual([]);
      expect(await payloadRan()).toBe(false);
    } finally {
      await context.close();
    }
  });
});
