import type { Browser, BrowserContext, Page } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { URLS } from '../playwright.config';
import { loginAccountViaApi, type Account } from './accounts';
import { skipSwipeIntro } from './swipe-intro';

export type SignedInSession = {
  page: Page;
  context: BrowserContext;
  api: ApiClient;
  close: () => Promise<void>;
};

/**
 * Open a browser already signed in as a throwaway account, without driving the
 * login form: log in through the API and hand the session cookies to a fresh
 * context (cookies are scoped to `localhost`, not to a port, so the SPA on :3000
 * sends the gateway's :4000 cookies). Keeps specs clear of the login rate limit
 * and of one more slow UI login. The same `api` context stays usable for setup.
 */
export async function openSignedInSession(
  browser: Browser,
  account: Account
): Promise<SignedInSession> {
  const api = await loginAccountViaApi(account);
  const context = await browser.newContext({
    baseURL: URLS.client,
    storageState: await api.context.storageState(),
  });
  const page = await context.newPage();
  await skipSwipeIntro(page);
  return {
    page,
    context,
    api,
    close: async () => {
      await context.close();
      await api.dispose();
    },
  };
}
