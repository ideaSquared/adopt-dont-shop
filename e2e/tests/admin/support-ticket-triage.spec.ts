import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi, type Account } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { uniqueText } from '../../helpers/factories';
import { expectOk, postWithCsrf } from '../../helpers/seeds';

/**
 * Support triage: a ticket an adopter opens shows up in the admin Support list
 * with its details, and an admin's reply (public or internal) is stored and
 * only the public one reaches the adopter.
 */

type OpenedTicket = { ticketId: string; subject: string; adopter: Account };

const openTicketAsAdopter = async (label: string): Promise<OpenedTicket> => {
  const adopter = await createVerifiedAdopter(label);
  const adopterApi = await loginAccountViaApi(adopter);
  try {
    const subject = uniqueText('Cannot upload my photo');
    const created = await postWithCsrf(adopterApi.context, '/api/v1/support/tickets', {
      subject,
      description: 'E2E: the upload spinner never finishes on my profile photo.',
      category: 'technical_issue',
      priority: 'high',
      userEmail: adopter.email,
      userName: 'E2E Adopter',
    });
    await expectOk(created, 'open support ticket');
    const { data } = (await created.json()) as { data: { ticketId: string } };
    return { ticketId: data.ticketId, subject, adopter };
  } finally {
    await adopterApi.dispose();
  }
};

const openTicketInAdmin = async (page: Page, ticket: OpenedTicket): Promise<void> => {
  await dismissCookieBannerPatiently(page);
  await page.goto('/support');
  await page.getByPlaceholder('Search tickets by subject, user, or email...').fill(ticket.subject);
  const row = page.getByRole('row').filter({ hasText: ticket.subject });
  await expect(row).toHaveCount(1, { timeout: 30_000 });
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/support/${ticket.ticketId}$`));
};

// The ticket pane re-renders (back to Overview) when the list refetches, so retry
// the tab click until the reply form is actually showing.
const openResponsesTab = async (page: Page): Promise<void> => {
  await expect(async () => {
    await page.getByRole('tab', { name: /^Responses/ }).click();
    await expect(page.getByPlaceholder('Type your response here...')).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 20_000 });
};

const adopterVisibleReplies = async (ticket: OpenedTicket): Promise<string> => {
  const adopterApi = await loginAccountViaApi(ticket.adopter);
  try {
    const res = await adopterApi.context.get(`/api/v1/support/tickets/${ticket.ticketId}/messages`);
    expect(res.ok()).toBe(true);
    return JSON.stringify(await res.json());
  } finally {
    await adopterApi.dispose();
  }
};

test.describe('admin support ticket triage', () => {
  test('a ticket an adopter opens is listed with its subject, requester, category, priority and status', async ({
    page,
  }) => {
    const ticket = await openTicketAsAdopter('ticket-list');

    await dismissCookieBannerPatiently(page);
    await page.goto('/support');
    await expect(page.getByRole('heading', { level: 1, name: 'Support Tickets' })).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByPlaceholder('Search tickets by subject, user, or email...')
      .fill(ticket.subject);

    const row = page.getByRole('row').filter({ hasText: ticket.subject });
    await expect(row).toHaveCount(1, { timeout: 30_000 });
    await expect(row).toContainText(`E2E Adopter (${ticket.adopter.email})`);
    await expect(row.getByRole('cell', { name: 'Technical Issue' })).toBeVisible();
    await expect(row.getByText('High', { exact: true })).toBeVisible();
    await expect(row.getByText('Open', { exact: true })).toBeVisible();
  });

  const sendReply = async (page: Page, text: string, internal: boolean): Promise<void> => {
    await openResponsesTab(page);
    await page.getByPlaceholder('Type your response here...').fill(text);
    if (internal) {
      await page.getByLabel(/Internal note/).check();
    }
    const stored = page.waitForResponse(
      res => res.url().includes('/responses') && res.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Send Response' }).click();
    expect((await stored).status()).toBe(201);
    // The page re-renders the ticket pane back on Overview once the reply lands;
    // wait for that so the next action does not hit a pane being replaced.
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  };

  test('an admin reply is stored on the ticket and reaches the adopter; an internal note does not', async ({
    page,
    apiAs,
  }) => {
    const ticket = await openTicketAsAdopter('ticket-reply');
    const publicReply = uniqueText('Please try a smaller JPEG');
    const internalNote = uniqueText('Check the upload bucket quota');

    await openTicketInAdmin(page, ticket);
    await sendReply(page, publicReply, false);
    await sendReply(page, internalNote, true);

    // Both replies are stored against the ticket, the internal one flagged ...
    const adminApi = await apiAs('admin');
    const stored = await adminApi.context.get(`/api/v1/admin/support/tickets/${ticket.ticketId}`);
    expect(stored.ok()).toBe(true);
    const { responses } = (await stored.json()) as {
      responses: Array<{ content: string; isInternal: boolean }>;
    };
    expect(responses.map(r => [r.content, r.isInternal])).toEqual([
      [publicReply, false],
      [internalNote, true],
    ]);

    // ... but only the public one is visible to the adopter.
    const seenByAdopter = await adopterVisibleReplies(ticket);
    expect(seenByAdopter).toContain(publicReply);
    expect(seenByAdopter).not.toContain(internalNote);
  });

  // BUG: the admin ticket list (GET /admin/support/tickets) carries no responses and the
  // Support page builds the ticket modal from that list, so stored replies never show:
  // the ticket reads "Responses (0)" / "No responses yet" even after a reload.
  test.fail(
    'a stored reply shows in the ticket Responses tab after reloading',
    async ({ page }) => {
      const ticket = await openTicketAsAdopter('ticket-reply-live');
      const reply = uniqueText('Thanks, we are looking into it');

      await openTicketInAdmin(page, ticket);
      await sendReply(page, reply, false);

      await page.reload();
      await expect(page.getByRole('tab', { name: 'Responses (1)' })).toBeVisible({
        timeout: 30_000,
      });
      await page.getByRole('tab', { name: 'Responses (1)' }).click();
      await expect(page.getByText(reply)).toBeVisible();
    }
  );
});
