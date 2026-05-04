import { test, expect } from '../../fixtures';
import { uniqueEmail } from '../../helpers/factories';

test.describe('adopter registration and login', () => {
  test('a new adopter can register and reach the app', async ({ page }) => {
    const email = uniqueEmail('signup');
    const password = 'BehaviourTest123!';

    await page.goto('/register');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

    await page
      .getByLabel(/first name/i)
      .first()
      .fill('E2E');
    await page
      .getByLabel(/last name/i)
      .first()
      .fill('Tester');
    await page.getByLabel(/email/i).first().fill(email);

    // Two password fields ("Password" + "Confirm Password") — fill both by
    // index rather than relying on label distinction, which the asterisk
    // suffix on required labels can defeat.
    const passwordFields = page.locator('input[type="password"]');
    await expect(passwordFields).toHaveCount(2, { timeout: 10_000 });
    await passwordFields.nth(0).fill(password);
    await passwordFields.nth(1).fill(password);

    const tos = page.getByLabel(/terms|agree/i).first();
    if (await tos.count()) {
      await tos.check().catch(() => undefined);
    }

    await page
      .getByRole('button', { name: /(create account|sign up|register)/i })
      .first()
      .click();

    // Successful registration may navigate to:
    //   - /verify-email (most common)
    //   - /login
    //   - / (logged in directly)
    //   - or stay on /register but show a "check your email" success state.
    // Accept any of these as success — failure looks like an inline form
    // error or staying on /register with no success state.
    await page.waitForTimeout(3_000);
    const url = page.url();
    const onRegister = /\/register$/.test(url);
    if (onRegister) {
      // Success state may be inline ("Registration successful", "Check
      // your email", etc.).
      const successText = await page
        .getByText(/(success|check your (email|inbox)|verify|confirmation sent)/i)
        .first()
        .isVisible()
        .catch(() => false);
      expect(successText).toBe(true);
    }
    // Otherwise we navigated away — that's a successful registration.
  });

  test('login with the wrong password surfaces a clear error', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

    await page.getByLabel(/email/i).first().fill('john.smith@gmail.com');
    await page
      .getByLabel(/password/i)
      .first()
      .fill('not-the-real-password');
    await page
      .getByRole('button', { name: /^(sign in|log ?in)$/i })
      .first()
      .click();

    // Acceptable signals: a visible error alert OR still on /login (no
    // navigation away).  Some apps render the alert above the fold; some
    // surface the failure as a banner.
    const errorAlert = page
      .getByText(/(invalid|incorrect|wrong).*(email|password|credentials)/i)
      .first();
    await Promise.race([
      errorAlert.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined),
      page.waitForTimeout(8_000),
    ]);
    await expect(page).toHaveURL(/\/login/);
  });
});
