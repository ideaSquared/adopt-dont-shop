import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniqueText } from '../../helpers/factories';
import { deleteWithCsrf } from '../../helpers/seeds';

/**
 * RES-070 / RES-071: a rescue manager creates an event, sees it listed with the
 * right UK date and time, edits it, and deletes it again.
 */
type ApiEvent = { id?: string; event_id?: string; name: string };

const EVENT_PREFIX = 'e2e-event';

const createEvent = async (page: Page, name: string): Promise<void> => {
  await page.goto('/events');
  await dismissCookieBannerWhenShown(page);
  // Disabled until the event list has loaded.
  const open = page.getByRole('button', { name: 'Create Event' });
  await expect(open).toBeEnabled({ timeout: 30_000 });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Create New Event' });
  await dialog.getByLabel('Event Name').fill(name);
  await dialog.getByLabel('Description').fill('Meet the dogs and cats looking for homes.');
  // June, so UK local time (BST) differs from UTC.
  await dialog.getByLabel('Start Date & Time').fill('2030-06-15T10:00');
  await dialog.getByLabel('End Date & Time').fill('2030-06-15T14:30');
  await dialog.getByRole('button', { name: 'Create Event' }).click();
};

test.describe('rescue events', () => {
  test.use({ timezoneId: 'Europe/London', locale: 'en-GB' });

  // Safety net: a failed run must not leave its event on the shared rescue.
  test.afterEach(async ({ apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const res = await rescueApi.context.get('/api/v1/events');
    const { data } = (await res.json()) as { data: ApiEvent[] };
    const leftovers = data.filter(event => event.name.includes(EVENT_PREFIX));
    await Promise.all(
      leftovers.map(event =>
        deleteWithCsrf(rescueApi.context, `/api/v1/events/${event.id ?? event.event_id}`)
      )
    );
  });

  test('a manager can create, edit and delete an event', async ({ page }) => {
    const name = uniqueText(EVENT_PREFIX);
    const renamed = `${name}-renamed`;

    await createEvent(page, name);
    const card = page.getByRole('button', { name: new RegExp(name) });
    await expect(card).toBeVisible();

    // It persists with the right date.
    await page.reload();
    await expect(card).toBeVisible();
    await expect(card).toContainText('15/06/2030');

    // Edit
    await card.click();
    await page
      .getByRole('dialog', { name: 'Event Details' })
      .getByRole('button', { name: /edit/i })
      .click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Event' });
    // App bugs, worked around here: (1) the edit form's date fields come up empty
    // (the stored ISO value is not a valid datetime-local value), so the dates
    // are re-entered; (2) the create and edit forms are both in the DOM with the
    // same input ids, so labels resolve to the create form — hence the placeholder.
    await editDialog.getByPlaceholder('e.g., Spring Adoption Fair').fill(renamed);
    await editDialog.locator('input[type="datetime-local"]').first().fill('2030-06-15T10:00');
    await editDialog.locator('input[type="datetime-local"]').last().fill('2030-06-15T14:30');
    await editDialog.getByRole('button', { name: 'Update Event' }).click();

    const renamedCard = page.getByRole('button', { name: new RegExp(renamed) });
    await expect(renamedCard).toBeVisible();
    await page.reload();
    await expect(renamedCard).toBeVisible();

    // Delete
    await renamedCard.click();
    await page
      .getByRole('dialog', { name: 'Event Details' })
      .getByRole('button', { name: /delete/i })
      .click();
    await page.getByRole('button', { name: 'Delete event' }).click();

    await expect(renamedCard).toBeHidden();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Event Management' })).toBeVisible();
    await expect(renamedCard).toBeHidden();
  });

  // App bug: an event entered as 10:00-14:30 UK time in summer is listed as
  // 11:00 - 15:30. The form sends the datetime-local value with no offset and
  // the list shifts it by an hour in BST (UTC/local mix-up). Remove the
  // fixme once the entered time round-trips.
  test.fixme('the listed time is the UK time the manager entered', async ({ page }) => {
    const name = uniqueText(EVENT_PREFIX);

    await createEvent(page, name);
    await page.reload();

    const card = page.getByRole('button', { name: new RegExp(name) });
    await expect(card).toContainText('10:00');
    await expect(card).toContainText('14:30');
  });
});
