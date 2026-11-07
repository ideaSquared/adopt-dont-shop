import {
  request as playwrightRequest,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { URLS } from '../playwright.config';
import type { Account } from './accounts';
import { uniqueEmail, uniqueRescueName } from './factories';
import { expectOk, postWithCsrf } from './seeds';
import { peekInvitationToken } from './token-peek';

export const STAFF_PASSWORD = 'BehaviourTest123!';

// Accepting an invitation is limited to 10 a minute per IP, and every spec on
// the shared stack spends from that budget. On a 429, wait out the window the
// gateway names and try again; any other status is returned as it is.
const RATE_LIMIT_ATTEMPTS = 4;
const DEFAULT_RETRY_AFTER_SECONDS = 20;

const postAcceptingRateLimit = async (
  ctx: APIRequestContext,
  url: string,
  data: unknown
): Promise<APIResponse> => {
  const attempt = async (remaining: number): Promise<APIResponse> => {
    const res = await postWithCsrf(ctx, url, data);
    if (res.status() !== 429 || remaining === 0) {
      return res;
    }
    const retryAfter = Number(res.headers()['retry-after'] ?? DEFAULT_RETRY_AFTER_SECONDS);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return attempt(remaining - 1);
  };
  return attempt(RATE_LIMIT_ATTEMPTS);
};
export type ThrowawayRescue = {
  rescueId: string;
  name: string;
  /** The staff member who accepted the first invitation. */
  owner: Account;
};

/**
 * Invite a new email to a rescue as the admin and read the emailed token
 * through the peek seam. Nothing is accepted yet.
 */
export async function inviteStaff(
  adminApi: ApiClient,
  rescueId: string,
  options: { title: string; label: string }
): Promise<{ email: string; token: string }> {
  const email = uniqueEmail(options.label);
  const invited = await postWithCsrf(adminApi.context, `/api/v1/rescues/${rescueId}/invitations`, {
    email,
    title: options.title,
  });
  await expectOk(invited, `invite ${email}`);
  const token = await peekInvitationToken(email, rescueId);
  if (!token) {
    throw new Error(`no invitation token for ${email}`);
  }
  return { email, token };
}

/**
 * Invite a new staff member and accept at once: the account is provisioned and
 * joins the rescue. Returns the new staff member's login.
 */
export async function inviteAndAcceptStaff(
  adminApi: ApiClient,
  rescueId: string,
  options: { title: string; label: string; firstName?: string }
): Promise<Account> {
  const { email, token } = await inviteStaff(adminApi, rescueId, options);
  const firstName = options.firstName ?? 'Staffer';
  const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const accepted = await postAcceptingRateLimit(anon, '/api/v1/invitations/accept', {
      token,
      password: STAFF_PASSWORD,
      firstName,
      lastName: 'E2E',
    });
    await expectOk(accepted, `accept invitation for ${email}`);
  } finally {
    await anon.dispose();
  }
  return { email, password: STAFF_PASSWORD, firstName };
}

/**
 * A rescue of its own, so tests that change its staff or approval state leave
 * the shared Paws Rescue alone. `verified: false` leaves it pending approval.
 */
export async function createRescueWithOwner(
  adminApi: ApiClient,
  label: string,
  options: { verified: boolean } = { verified: true }
): Promise<ThrowawayRescue> {
  const name = uniqueRescueName(label);
  const created = await postWithCsrf(adminApi.context, '/api/v1/rescues', {
    name,
    email: uniqueEmail('rescue-contact'),
    address: '1 Rescue Lane',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'GB',
    contact_person: 'Rae Scue',
  });
  await expectOk(created, `create rescue ${name}`);
  const { data } = (await created.json()) as { data: { rescue_id: string } };
  const rescueId = data.rescue_id;
  if (options.verified) {
    await expectOk(
      await postWithCsrf(adminApi.context, `/api/v1/rescues/${rescueId}/verify`, {}),
      `verify rescue ${name}`
    );
  }
  const owner = await inviteAndAcceptStaff(adminApi, rescueId, {
    title: 'Manager',
    label: 'rescue-owner',
    firstName: 'Rae',
  });
  return { rescueId, name, owner };
}
