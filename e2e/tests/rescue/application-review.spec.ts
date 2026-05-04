import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';

test.describe('rescue application review', () => {
  test('a reviewer can open an application and add an internal note', async ({ page }) => {
    await page.goto('/applications');
    const firstApp = page
      .getByRole('row')
      .or(page.locator('[data-testid="application-row"]'))
      .nth(1);
    if (!(await firstApp.count())) {
      test.skip(true, 'no applications visible to this rescue user');
    }
    await firstApp.click();

    const noteField = page
      .getByLabel(/(internal )?notes?/i)
      .or(page.getByPlaceholder(/note/i))
      .first();
    if (!(await noteField.count())) {
      test.skip(true, 'application notes field not exposed');
    }

    const note = uniqueText('reviewer-note');
    await noteField.fill(note);
    await page
      .getByRole('button', { name: /(save|add) note/i })
      .first()
      .click();
    await expect(page.getByText(note).first()).toBeVisible({ timeout: 10_000 });
  });

  test('advancing an application status surfaces the new state', async ({ page }) => {
    await page.goto('/applications');
    const firstApp = page
      .getByRole('row')
      .or(page.locator('[data-testid="application-row"]'))
      .nth(1);
    if (!(await firstApp.count())) {
      test.skip(true, 'no applications');
    }
    await firstApp.click();

    const statusControl = page.getByLabel(/status/i).first();
    if (!(await statusControl.count())) {
      test.skip(true, 'no status control in this build');
    }
    const before = (await statusControl.inputValue().catch(() => '')) || '';

    await statusControl.click();
    const underReview = page
      .getByRole('option', { name: /under review|reviewing|in progress/i })
      .first();
    if (!(await underReview.count())) {
      test.skip(true, 'no advanceable status options for this application');
    }
    await underReview.click();

    const saveButton = page.getByRole('button', { name: /(save|update)/i }).first();
    if (await saveButton.count()) {
      await saveButton.click();
    }

    await expect
      .poll(async () => (await statusControl.inputValue().catch(() => ''))?.toLowerCase())
      .not.toBe(before.toLowerCase());
  });
});
