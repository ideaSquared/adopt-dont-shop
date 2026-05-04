import { test, expect } from '../../fixtures';
import { loginViaUI, logoutViaUI } from '../../helpers/auth';
import { uniqueEmail } from '../../helpers/factories';

test.describe('adopter registration and login', () => {
  test('a new adopter can register, log out, and log back in', async ({ page }) => {
    const email = uniqueEmail('signup');
    const password = 'BehaviourTest123!';

    await page.goto('/register');
    await page
      .getByLabel(/first name/i)
      .first()
      .fill('E2E');
    await page
      .getByLabel(/last name/i)
      .first()
      .fill('Tester');
    await page
      .getByLabel(/^email/i)
      .first()
      .fill(email);
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill(password);

    const confirmPassword = page.getByLabel(/confirm password|repeat password/i).first();
    if (await confirmPassword.count()) {
      await confirmPassword.fill(password);
    }

    const tos = page.getByLabel(/terms|agree/i).first();
    if (await tos.count()) {
      await tos.check();
    }

    await page
      .getByRole('button', { name: /(create account|sign up|register)/i })
      .first()
      .click();

    // Successful registration leaves the registration page (either to a
    // verification prompt, dashboard, or the login screen).
    await expect(page).not.toHaveURL(/\/register$/, { timeout: 20_000 });

    await logoutViaUI(page).catch(async () => {
      // If the post-register UI doesn't expose logout (e.g. shows a verify-email
      // wall), navigate to /login directly to exercise the second login.
      await page.goto('/login');
    });

    await loginViaUI(page, email, password);
    await expect(page).not.toHaveURL(/\/login$/);
  });

  test('login with the wrong password surfaces a clear error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill('john.smith@gmail.com');
    await page
      .getByLabel(/password/i)
      .first()
      .fill('not-the-real-password');
    await page
      .getByRole('button', { name: /^(sign in|log ?in)$/i })
      .first()
      .click();

    await expect(
      page.getByText(/(invalid|incorrect|wrong).*(email|password|credentials)/i).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
