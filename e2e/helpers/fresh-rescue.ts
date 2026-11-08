import { request as playwrightRequest } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { URLS } from '../playwright.config';
import type { Account } from './accounts';
import { uniqueEmail, uniqueRescueName } from './factories';
import { deleteWithCsrf, expectOk, postWithCsrf } from './seeds';
import { peekInvitationToken } from './token-peek';

export type FreshRescue = {
  rescueId: string;
  name: string;
  /** A rescue_staff user who accepted an invitation to this rescue. */
  manager: Account;
};

// POST /invitations/accept is limited to 10/min per IP and every e2e worker shares
// one IP, so wait out the window rather than failing the whole journey.
const ACCEPT_RETRY_DELAY_MS = 10_000;
const ACCEPT_MAX_ATTEMPTS = 8;

const MANAGER_PASSWORD = 'BehaviourTest123!';

/**
 * Create a throwaway rescue (starts "pending") with one staff manager who can
 * sign in to the rescue app. The admin creates the rescue and invites the
 * manager; the invitation is accepted through the token-peek seam. Pair with
 * `removeFreshRescue` so the shared stack is left as it was found.
 */
export async function createFreshRescue(
  adminApi: ApiClient,
  label = 'rescue',
  extraFields: Record<string, string> = {}
): Promise<FreshRescue> {
  const name = uniqueRescueName(`E2E ${label}`);
  const created = await postWithCsrf(adminApi.context, '/api/v1/rescues', {
    name,
    email: uniqueEmail(`${label}-org`),
    address: '1 Test Street',
    city: 'Leeds',
    postcode: 'LS1 1AA',
    contact_person: 'E2E Manager',
    ...extraFields,
  });
  await expectOk(created, 'create rescue');
  const { data } = (await created.json()) as { data: { rescue_id: string } };
  const rescueId = data.rescue_id;

  const managerEmail = uniqueEmail(`${label}-mgr`);
  const invited = await postWithCsrf(adminApi.context, `/api/v1/rescues/${rescueId}/invitations`, {
    email: managerEmail,
    title: 'Manager',
  });
  await expectOk(invited, 'invite rescue manager');
  const token = await peekInvitationToken(managerEmail, rescueId);
  if (!token) {
    throw new Error(`no invitation token for ${managerEmail}`);
  }

  const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const accept = () =>
      postWithCsrf(anon, '/api/v1/invitations/accept', {
        token,
        password: MANAGER_PASSWORD,
        firstName: 'E2E',
        lastName: 'Manager',
      });
    let accepted = await accept();
    for (
      let attempt = 1;
      accepted.status() === 429 && attempt < ACCEPT_MAX_ATTEMPTS;
      attempt += 1
    ) {
      await new Promise(resolve => setTimeout(resolve, ACCEPT_RETRY_DELAY_MS));
      accepted = await accept();
    }
    await expectOk(accepted, 'accept rescue invitation');
  } finally {
    await anon.dispose();
  }

  return {
    rescueId,
    name,
    manager: { email: managerEmail, password: MANAGER_PASSWORD, firstName: 'E2E' },
  };
}

/** Soft-delete a throwaway rescue created by `createFreshRescue`. */
export async function removeFreshRescue(adminApi: ApiClient, rescueId: string): Promise<void> {
  await deleteWithCsrf(adminApi.context, `/api/v1/rescues/${rescueId}`);
}
