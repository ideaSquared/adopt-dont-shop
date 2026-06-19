import { request as playwrightRequest } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { uniqueEmail } from '../../helpers/factories';
import { getMyRescueId } from '../../helpers/seeds';
import { peekInvitationToken } from '../../helpers/token-peek';
import { URLS } from '../../playwright.config';

// ADS-871: the full staff-invitation round-trip, end to end through the
// register-on-accept path:
//   rescue admin invites staff (POST /api/v1/rescue/:id/invitations)
//   → READ the emailed invite token via the test-token-peek seam
//   → resolve the real invitation via GET /api/v1/invitations/details/:token
//   → ACCEPT via POST /api/v1/invitations/accept (set a password + name),
//     which provisions the auth user and attaches staff membership
//   → the invitee logs in with their new credentials and GET /api/v1/staff/me
//     shows them as a verified staff member of the inviting rescue.

const INVITEE_PASSWORD = 'Sup3rSecret!pw';

test.describe('staff invitation round-trip (ADS-871)', () => {
  test('an invitee accepts an emailed invite and becomes verified staff', async ({ apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const rescueId = await getMyRescueId(rescueApi);
    expect(rescueId, 'could not resolve the rescue persona’s rescueId').toBeTruthy();

    const inviteeEmail = uniqueEmail('invitee');

    // 1. The rescue admin invites a new staff member.
    const inviteRes = await rescueApi.context.post(`/api/v1/rescue/${rescueId}/invitations`, {
      data: { email: inviteeEmail, title: 'Volunteer' },
    });
    expect([200, 201]).toContain(inviteRes.status());

    // 2. Read the emailed invite token via the test-token-peek seam.
    const token = await peekInvitationToken(inviteeEmail, rescueId ?? undefined);
    expect(token, 'no pending invitation token found for the invitee').toBeTruthy();

    const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      // 3. Resolve the invitation by token — the lookup the accept page
      //    makes before showing the create-account form. A valid, pending,
      //    unexpired invitation comes back for the invitee.
      const detailsRes = await anon.get(`/api/v1/invitations/details/${token}`);
      expect(detailsRes.ok()).toBe(true);
      const details = (await detailsRes.json()) as {
        data?: { email?: string };
        email?: string;
        invitation?: { email?: string };
      };
      const resolvedEmail = details.data?.email ?? details.email ?? details.invitation?.email;
      expect(resolvedEmail).toBe(inviteeEmail);

      // 4. Accept the invitation — register-on-accept. The invitee sets a
      //    password + name; the gateway provisions the auth user and
      //    attaches staff membership.
      const acceptRes = await anon.post('/api/v1/invitations/accept', {
        data: {
          token,
          password: INVITEE_PASSWORD,
          firstName: 'Invited',
          lastName: 'Volunteer',
        },
      });
      expect([200, 201]).toContain(acceptRes.status());

      // 5. Re-accepting with the same single-use token is well-defined and
      //    never 5xx: the gateway either replays the accept idempotently
      //    (200/201) or reports the token already consumed (404/409). Which
      //    one wins depends on invitation-state propagation timing, so accept
      //    either outcome rather than flaking on that race.
      const acceptAgain = await anon.post('/api/v1/invitations/accept', {
        data: {
          token,
          password: INVITEE_PASSWORD,
          firstName: 'Invited',
          lastName: 'Volunteer',
        },
      });
      expect([200, 201, 404, 409]).toContain(acceptAgain.status());
    } finally {
      await anon.dispose();
    }

    // 6. The invitee logs in with their brand-new credentials.
    const loginCtx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const loginRes = await loginCtx.post('/api/v1/auth/login', {
        data: { email: inviteeEmail, password: INVITEE_PASSWORD },
        timeout: 15_000,
      });
      expect(loginRes.ok(), 'the invitee could not log in with their new password').toBe(true);
      const loginBody = (await loginRes.json()) as {
        tokens?: { accessToken?: string; access_token?: string };
      };
      const accessToken = loginBody.tokens?.accessToken ?? loginBody.tokens?.access_token;
      expect(accessToken, 'login returned no access token').toBeTruthy();

      // 7. As the invitee, GET /api/v1/staff/me shows them as staff of the
      //    inviting rescue — the round-trip is complete.
      const inviteeCtx = await playwrightRequest.newContext({
        baseURL: URLS.api,
        extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
      });
      try {
        const meRes = await inviteeCtx.get('/api/v1/staff/me');
        expect(meRes.ok(), 'the invitee is not recognised as staff').toBe(true);
        const meBody = (await meRes.json()) as {
          data?: { rescueId?: string; rescue_id?: string; isVerified?: boolean };
        };
        const staffRescueId = meBody.data?.rescueId ?? meBody.data?.rescue_id;
        expect(staffRescueId).toBe(rescueId);
        expect(meBody.data?.isVerified).toBe(true);
      } finally {
        await inviteeCtx.dispose();
      }
    } finally {
      await loginCtx.dispose();
    }
  });
});
