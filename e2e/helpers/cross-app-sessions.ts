import type { Browser, BrowserContext } from '@playwright/test';

import { ROLES, type RoleKey } from '../fixtures/roles';
import { roleStorageState } from '../fixtures/api';
import { loginAccountViaApi, type Account } from './accounts';

/**
 * A browser context signed in as one of the shared personas, restored from the
 * storage state global-setup saved. Cross-app journeys use this instead of the
 * `asRole` fixture so they do not spend one of the gateway's ~10 logins a
 * minute (shared by every spec on the stack) on each extra app they visit.
 */
export async function openRoleContext(browser: Browser, role: RoleKey): Promise<BrowserContext> {
  return browser.newContext({
    baseURL: ROLES[role].appUrl,
    storageState: await roleStorageState(role),
  });
}

/**
 * A browser context signed in as a throwaway account. The session comes from
 * one API login whose cookies are handed to the browser, so the app boots
 * already authenticated without driving the login form.
 */
export async function openAccountContext(
  browser: Browser,
  account: Account,
  baseURL: string
): Promise<BrowserContext> {
  const api = await loginAccountViaApi(account);
  try {
    const storageState = await api.context.storageState();
    return await browser.newContext({ baseURL, storageState });
  } finally {
    await api.dispose();
  }
}
