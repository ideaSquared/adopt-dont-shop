import { request as playwrightRequest } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { uniqueEmail } from '../../helpers/factories';
import { getMyRescueId } from '../../helpers/seeds';
import { peekInvitationToken } from '../../helpers/token-peek';
import { URLS } from '../../playwright.config';

// ADS-871: the staff-invitation round-trip, driven as far as the backend
// supports. Today's staff-invitation-acceptance + invitation-expiry specs only
// assert the anonymous INVALID/EMPTY-token states on /accept-invitation — they
// can't read a real emailed token. This drives the real path:
//   rescue admin invites staff (POST /api/v1/rescue/:id/invitations)
//   → READ the emailed invite token via the test-token-peek seam
//   → resolve the real invitation via GET /api/v1/invitations/details/:token,
//     confirming the token maps to a valid, PENDING invitation for the invitee.
//
// DEFERRED (documented): the final "accept → invitee becomes verified staff"
// step is NOT wired through the gateway. The rescue proto/service expose
// InviteStaff + GetInvitationByToken but NO AcceptInvitation RPC, and there is
// no POST /api/v1/invitations/accept gateway route — the AcceptInvitation SPA
// page would 404 on submit. Completing the round-trip needs that feature built
// (proto RPC + rescue handler + gateway route + UI wiring), which is out of
// ADS-871's scope. This spec covers everything up to (not including) accept.

test.describe('staff invitation round-trip (ADS-871)', () => {
  test('an emailed invite token resolves to a valid pending invitation', async ({ apiAs }) => {
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

    // 3. Resolve the invitation by token — the same lookup the
    //    /accept-invitation page makes before showing the create-account form.
    //    A valid, pending, unexpired invitation comes back for the invitee.
    const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const detailsRes = await anon.get(`/api/v1/invitations/details/${token}`);
      expect(detailsRes.ok()).toBe(true);
      const body = (await detailsRes.json()) as {
        data?: { email?: string };
        email?: string;
        invitation?: { email?: string };
      };
      const resolvedEmail = body.data?.email ?? body.email ?? body.invitation?.email;
      expect(resolvedEmail).toBe(inviteeEmail);
    } finally {
      await anon.dispose();
    }
  });
});
