import type { Page } from '@playwright/test';

import { test, expect, type ApiClient } from '../../fixtures';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { createFreshRescue, removeFreshRescue } from '../../helpers/fresh-rescue';
import { deleteWithCsrf, expectOk, postWithCsrf } from '../../helpers/seeds';

/**
 * Field permissions (ADM-130): an admin overrides what the adopter role may
 * see of one field of a rescue. Overrides are global per role, so each Playwright
 * worker slot uses its own field (more workers than fields is rejected, never wrapped) and every test restores the
 * default in `finally`.
 */

type RescueField = {
  /** Field name on the Field Permissions page and in the override API. */
  field: string;
  /** The same field in the rescue JSON adopters receive. */
  jsonKey: string;
  /** Request body key and value that give a new rescue a value for it. */
  create: Record<string, string>;
};

const RESCUE_FIELDS: readonly RescueField[] = [
  { field: 'mission', jsonKey: 'mission', create: { mission: 'We rehome senior dogs' } },
  { field: 'description', jsonKey: 'description', create: { description: 'A small rescue' } },
  { field: 'website', jsonKey: 'website', create: { website: 'https://e2e.example.test' } },
  { field: 'contactTitle', jsonKey: 'contact_title', create: { contact_title: 'Founder' } },
  { field: 'contactPhone', jsonKey: 'contact_phone', create: { contact_phone: '01132000000' } },
  { field: 'phone', jsonKey: 'phone', create: { phone: '01132000001' } },
  { field: 'county', jsonKey: 'county', create: { county: 'West Yorkshire' } },
  { field: 'contactEmail', jsonKey: 'contact_email', create: { contact_email: 'c@e2e.test' } },
];

const fieldForWorker = (): RescueField => {
  // Never wrap: two workers sharing a field would overwrite each other's global override.
  const { parallelIndex } = test.info();
  const choice = RESCUE_FIELDS[parallelIndex];
  if (!choice) {
    throw new Error(
      `worker slot ${parallelIndex} has no rescue field of its own (${RESCUE_FIELDS.length} available): run these specs with at most ${RESCUE_FIELDS.length} workers`
    );
  }
  return choice;
};

const fieldRow = (page: Page, field: string) =>
  page.getByRole('row').filter({ has: page.getByText(field, { exact: true }) });

const selectAndWait = async (page: Page, name: string, loaded: RegExp): Promise<void> => {
  await Promise.all([
    page.waitForResponse(res => loaded.test(res.url())),
    page.getByRole('button', { name, exact: true }).click(),
  ]);
};

// Both selections refetch; let the table settle on the chosen resource and role before
// moving on, so a slower earlier response cannot overwrite the adopter view.
const expectAdopterRescueTable = async (page: Page): Promise<void> => {
  await expect(page.getByText('rescues - adopter access')).toBeVisible({ timeout: 15_000 });
};

const openAdopterRescueFields = async (page: Page, field: string): Promise<void> => {
  await dismissCookieBannerPatiently(page);
  const firstLoad = page.waitForResponse(res => /defaults\/users\/admin/.test(res.url()));
  await page.goto('/field-permissions');
  await firstLoad;
  await selectAndWait(page, 'rescues', /defaults\/rescues\/admin/);
  await expect(page.getByText('rescues - admin access')).toBeVisible({ timeout: 15_000 });
  await selectAndWait(page, 'adopter', /defaults\/rescues\/adopter/);
  await expectAdopterRescueTable(page);
  await expect(fieldRow(page, field)).toBeVisible({ timeout: 15_000 });
};

const saveOneChange = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Save 1 Change' }).click();
  await expect(page.getByText('Field permissions saved')).toBeVisible({ timeout: 15_000 });
};

const restoreDefault = (adminApi: ApiClient, field: string) =>
  deleteWithCsrf(adminApi.context, `/api/v1/field-permissions/rescues/adopter/${field}`);

test.describe('field permission overrides', () => {
  test('an override set on the adopter role persists and can be reverted', async ({
    page,
    apiAs,
  }) => {
    const { field } = fieldForWorker();
    const adminApi = await apiAs('admin');
    try {
      await openAdopterRescueFields(page, field);
      const effective = fieldRow(page, field).getByRole('combobox').last();
      await expect(effective).toHaveValue('read');
      await expect(fieldRow(page, field).getByText('Override')).toHaveCount(0);

      await effective.selectOption('none');
      await saveOneChange(page);

      await page.reload();
      await selectAndWait(page, 'rescues', /defaults\/rescues\/admin/);
      await expect(page.getByText('rescues - admin access')).toBeVisible({ timeout: 15_000 });
      await selectAndWait(page, 'adopter', /defaults\/rescues\/adopter/);
      await expectAdopterRescueTable(page);
      await expect(fieldRow(page, field).getByText('Override')).toBeVisible({ timeout: 15_000 });
      await expect(effective).toHaveValue('none');

      // Choosing the default again removes the override.
      await effective.selectOption('read');
      await saveOneChange(page);
      await expect(fieldRow(page, field).getByText('Override')).toHaveCount(0);
      await expect(effective).toHaveValue('read');
    } finally {
      await restoreDefault(adminApi, field);
    }
  });

  // BUG: nothing reads the saved overrides when masking responses
  // (resolveFieldAccessMap is never given an override source, see ADS-1037), so
  // the Field Permissions page is a phantom control: adopters still receive the
  // field after an admin sets it to "none".
  test.fail(
    'hiding a field from the adopter role removes it from what adopters see',
    async ({ page, apiAs }) => {
      const { field, jsonKey, create } = fieldForWorker();
      const adminApi = await apiAs('admin');
      const adopterApi = await apiAs('adopter');
      const rescue = await createFreshRescue(adminApi, 'fieldperm', create);
      try {
        const verified = await postWithCsrf(
          adminApi.context,
          `/api/v1/rescues/${rescue.rescueId}/verify`
        );
        await expectOk(verified, 'verify rescue');
        const readField = async (): Promise<unknown> => {
          const res = await adopterApi.context.get(`/api/v1/rescues/${rescue.rescueId}`);
          expect(res.ok()).toBe(true);
          return ((await res.json()) as { data: Record<string, unknown> }).data[jsonKey];
        };
        expect(await readField()).toBe(Object.values(create)[0]);

        await openAdopterRescueFields(page, field);
        await fieldRow(page, field).getByRole('combobox').last().selectOption('none');
        await saveOneChange(page);

        await expect.poll(readField, { timeout: 15_000 }).toBeFalsy();
      } finally {
        await restoreDefault(adminApi, field);
        await removeFreshRescue(adminApi, rescue.rescueId);
      }
    }
  );
});
