import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { createAdopterApplication, expectOk, postWithCsrf } from '../../helpers/seeds';
import { openSignedInSession } from '../../helpers/signed-in-session';

/**
 * The header bell shows how many notifications are unread, and that number is
 * the gateway's: GET /notifications/unread/count. Marking everything read drops
 * both to zero. A fresh adopter keeps the count under this test's control (the
 * seeded personas' notifications are shared with other specs); submitting an
 * application gives them their first notifications.
 */
test.describe('notification badge', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the header bell shows the unread count and clears after mark-all-read', async ({
    browser,
    apiAs,
  }) => {
    const session = await openSignedInSession(browser, await createVerifiedAdopter('badge'));
    const { page, api } = session;
    try {
      await createAdopterApplication(api, await apiAs('rescue'));
      const unreadCount = async (): Promise<number> => {
        const res = await api.context.get('/api/v1/notifications/unread/count');
        await expectOk(res, 'unread count');
        return ((await res.json()) as { data: { count: number } }).data.count;
      };
      await expect.poll(unreadCount, { timeout: 20_000 }).toBeGreaterThan(0);
      const initial = await unreadCount();

      await dismissCookieBannerPatiently(page);
      await page.goto('/search');
      const bell = page.getByRole('link', { name: /^Notifications/ });
      await expect(bell).toHaveAccessibleName(
        `Notifications, ${initial} unread ${initial === 1 ? 'item' : 'items'}`,
        { timeout: 20_000 }
      );

      const markRead = await postWithCsrf(api.context, '/api/v1/notifications/read-all');
      expect([200, 204]).toContain(markRead.status());
      expect(await unreadCount()).toBe(0);

      await page.reload();
      await expect(bell).toHaveAccessibleName('Notifications', { timeout: 20_000 });
    } finally {
      await session.close();
    }
  });
});
