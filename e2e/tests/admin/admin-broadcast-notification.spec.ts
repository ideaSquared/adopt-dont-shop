import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { uniqueText } from '../../helpers/factories';

/**
 * An admin broadcasts an in-app notification to all adopters from the
 * broadcast page. A freshly registered adopter receives it; a rescue staff
 * member, who is outside the chosen audience, does not.
 */
test.describe('broadcast notifications', () => {
  // FIXME: blocked by an environment bug. docker-compose does not set AUTH_GRPC_URL on
  // service-notifications, so Broadcast cannot resolve the cohort and both
  // GET /notifications/broadcast/preview and the send return 500 internal_error
  // (the page shows "internal_error" after "Preview & send"). The steps below
  // drive the real UI and were verified up to that point; enable once the
  // notifications service is wired to the auth service.
  test.fixme('an admin broadcast to all adopters reaches an adopter but not rescue staff', async ({
    page,
    apiAs,
  }) => {
    const adopter = await createVerifiedAdopter('broadcast');
    const adopterApi = await loginAccountViaApi(adopter);
    const title = uniqueText('Broadcast');

    try {
      await dismissCookieBannerPatiently(page);
      await page.goto('/notifications/broadcast');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Broadcast notifications' })
      ).toBeVisible({ timeout: 30_000 });

      await page.getByRole('combobox', { name: /audience/i }).click();
      await page.getByRole('option', { name: 'All adopters' }).click();
      await page.getByLabel('Title').fill(title);
      await page.getByLabel('Body').fill('E2E broadcast body for adopters.');
      await page.getByRole('button', { name: 'Preview & send' }).click();

      await expect(page.getByText('Confirm broadcast')).toBeVisible();
      await page.getByRole('button', { name: 'Send broadcast' }).click();
      await expect(page.getByText('Broadcast sent.')).toBeVisible({ timeout: 30_000 });

      const adopterRes = await adopterApi.context.get('/api/v1/notifications');
      expect(adopterRes.ok()).toBe(true);
      await expect
        .poll(
          async () =>
            JSON.stringify(await (await adopterApi.context.get('/api/v1/notifications')).json()),
          { timeout: 20_000 }
        )
        .toContain(title);

      const rescueApi = await apiAs('rescue');
      const rescueRes = await rescueApi.context.get('/api/v1/notifications');
      expect(rescueRes.ok()).toBe(true);
      expect(JSON.stringify(await rescueRes.json())).not.toContain(title);
    } finally {
      await adopterApi.dispose();
    }
  });
});
