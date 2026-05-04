import { test as base, expect, type Page } from '@playwright/test';

import { loginViaApi, type ApiClient } from './api';
import { ROLES, type RoleKey } from './roles';

type Fixtures = {
  apiAs: (role: RoleKey) => Promise<ApiClient>;
  /**
   * Open a fresh authenticated browser context for a different role than the project default.
   * Useful for cross-app journeys (e.g. rescue publishes → adopter sees).
   */
  asRole: (role: RoleKey) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixture signature requires a destructured first arg
  apiAs: async ({}, use) => {
    const clients: ApiClient[] = [];
    await use(async role => {
      const client = await loginViaApi(role);
      clients.push(client);
      return client;
    });
    for (const c of clients) {
      await c.dispose();
    }
  },
  asRole: async ({ browser }, use) => {
    const opened: { close: () => Promise<void> }[] = [];
    await use(async role => {
      const r = ROLES[role];
      const context = await browser.newContext({ baseURL: r.appUrl });
      const page = await context.newPage();
      // Reuse the role's storageState by logging in fresh through the UI.
      // Cheaper alternative: load from saved storageState file by passing
      // `storageState: AUTH_FILES[role]` on newContext, but that requires
      // matching baseURLs — fine because we set baseURL above.
      await page.goto('/login');
      await page.getByLabel(/email/i).first().fill(r.email);
      await page
        .getByLabel(/password/i)
        .first()
        .fill(r.password);
      await Promise.all([
        page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20_000 }),
        page
          .getByRole('button', { name: /^(sign in|log ?in)$/i })
          .first()
          .click(),
      ]);
      opened.push(context);
      return page;
    });
    for (const c of opened) {
      await c.close();
    }
  },
});

export { expect };
export type { ApiClient };
export { ROLES };
export type { RoleKey };
