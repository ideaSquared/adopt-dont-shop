import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi, type Account } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniqueEmail } from '../../helpers/factories';
import { skipSwipeIntro } from '../../helpers/swipe-intro';
import { peekAuthTokens } from '../../helpers/token-peek';
import { ROLES } from '../../fixtures/roles';
import { URLS } from '../../playwright.config';

const STACK_TRACE = /(\bat \w+.*\(.*:\d+:\d+\)|TypeError|ReferenceError|SQLSTATE|stack trace)/i;

const userMenuFor = (account: Account) =>
  ({ name: new RegExp(`user menu for ${account.firstName} adopter`, 'i') }) as const;

test.describe('client authentication journeys', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await skipSwipeIntro(page);
    await dismissCookieBannerWhenShown(page);
  });

  // CLI-002
  test('registering with an existing email creates no second account and leaks nothing', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.getByRole('textbox', { name: 'First Name*' }).fill('Dup');
    await page.getByRole('textbox', { name: 'Last Name*' }).fill('Licate');
    await page.getByRole('textbox', { name: 'Email Address*' }).fill(ROLES.adopter.email);
    await page.getByRole('textbox', { name: 'Password*', exact: true }).fill('AttackerPass123!');
    await page.getByRole('textbox', { name: 'Confirm Password*' }).fill('AttackerPass123!');
    await page.getByRole('checkbox', { name: /terms of service/i }).check();
    await page.getByRole('button', { name: 'Create Account' }).click();

    // The app answers with the same neutral "check your email" page it shows a
    // genuinely new visitor (account-enumeration protection), never a stack trace.
    await expect(page).toHaveURL(/\/check-your-email/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(STACK_TRACE);

    // No account was created or taken over: the new password does not work and
    // the original one still does.
    const attackerLogin = await page.request.post(`${URLS.api}/api/v1/auth/login`, {
      data: { email: ROLES.adopter.email, password: 'AttackerPass123!' },
    });
    expect(attackerLogin.ok()).toBe(false);
    const api = await loginAccountViaApi({
      email: ROLES.adopter.email,
      password: ROLES.adopter.password,
      firstName: 'John',
    });
    await api.dispose();
  });

  // CLI-003
  test('the registration form rejects each invalid field with its own message', async ({
    page,
  }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();
    const form = page.locator('form');
    const submit = page.getByRole('button', { name: 'Create Account' });

    // 1) Empty submit: the browser blocks it on every required field.
    await submit.click();
    await expect(page).toHaveURL(/\/register/);
    for (const name of ['First Name*', 'Last Name*', 'Email Address*']) {
      const field = page.getByRole('textbox', { name });
      expect(await field.evaluate(el => (el as HTMLInputElement).validity.valueMissing)).toBe(true);
    }

    // Take the browser's own validation out of the picture so the app's schema
    // messages are what we assert on.
    await form.evaluate(f => {
      (f as HTMLFormElement).noValidate = true;
    });
    await submit.click();
    await expect(form.getByText('Please enter a valid email address')).toBeVisible();
    await expect(form.getByText('You must accept the terms and conditions')).toBeVisible();
    await expect(form.getByText('Password must contain a special character')).toBeVisible();
    await expect(form.locator('[aria-invalid="true"]')).toHaveCount(4);

    // 2) Invalid email only.
    await page.getByRole('textbox', { name: 'First Name*' }).fill('Ava');
    await page.getByRole('textbox', { name: 'Last Name*' }).fill('Adopter');
    await page.getByRole('textbox', { name: 'Email Address*' }).fill('not-an-email');
    await page.getByRole('textbox', { name: 'Password*', exact: true }).fill('BehaviourTest123!');
    await page.getByRole('textbox', { name: 'Confirm Password*' }).fill('BehaviourTest123!');
    await page.getByRole('checkbox', { name: /terms of service/i }).check();
    await submit.click();
    await expect(form.getByText('Please enter a valid email address')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);

    // 3) Weak password: the live checklist says what is missing.
    await page.getByRole('textbox', { name: 'Email Address*' }).fill(uniqueEmail('weak'));
    await page.getByRole('textbox', { name: 'Password*', exact: true }).fill('weak');
    await page.getByRole('textbox', { name: 'Confirm Password*' }).fill('weak');
    await submit.click();
    await expect(form.getByText('Password requirements:')).toBeVisible();
    await expect(form.getByText('At least 8 characters')).toBeVisible();
    await expect(form.getByText('One uppercase letter')).toBeVisible();
    await expect(form.getByText('One number')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);

    // 4) Mismatched confirmation.
    await page.getByRole('textbox', { name: 'Password*', exact: true }).fill('BehaviourTest123!');
    await page.getByRole('textbox', { name: 'Confirm Password*' }).fill('Different123!');
    await submit.click();
    await expect(form.getByText("Passwords don't match")).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  // CLI-005
  test('a bad email-verification token shows a failure and never "verified"', async ({ page }) => {
    await page.goto('/verify-email?token=not-a-real-token');
    await expect(page.getByRole('heading', { name: /link expired/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: /resend verification email/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Email Verified!' })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(STACK_TRACE);
  });

  // CLI-007
  test('a wrong password shows an error that does not reveal which part was wrong', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill(ROLES.adopter.email);
    await page
      .getByLabel(/password/i)
      .first()
      .fill('definitely-not-the-password');
    await page
      .getByRole('button', { name: /^(sign in|log ?in)$/i })
      .first()
      .click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await expect(alert).not.toContainText(
      /(no (such )?user|not found|does not exist|wrong password)/i
    );
    await expect(alert).not.toContainText(STACK_TRACE);
    await expect(page).toHaveURL(/\/login/);
  });

  // CLI-008
  test('logging out from the menu ends the session and Back shows no account data', async ({
    page,
  }) => {
    const account = await createVerifiedAdopter('logout-ui');
    await loginViaUI(page, account.email, account.password);
    await page.goto('/profile');
    await expect(page.getByRole('button', userMenuFor(account))).toBeVisible({ timeout: 15_000 });

    // Keyboard-open the menu: the dev-login toggle floats over the avatar.
    await page.getByRole('button', userMenuFor(account)).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('menuitem', { name: /log out/i }).click();
    // Logging out of a protected page (/profile) ends on the login screen.
    await expect(page).toHaveURL(/localhost:3000\/(login)?$/);
    await expect(page.getByRole('button', userMenuFor(account))).toHaveCount(0);

    await page.goBack();
    await expect(page.getByRole('button', userMenuFor(account))).toHaveCount(0);
    await expect(page.getByText(account.email)).toHaveCount(0);

    // The server session is gone too, not just the UI.
    const me = await page.request.get(`${URLS.api}/api/v1/auth/me`);
    expect(me.status()).toBe(401);
  });

  // CLI-009
  test('a used reset link cannot be reused and the old password stops working', async ({
    page,
  }) => {
    const account = await createVerifiedAdopter('reset-reuse');
    const newPassword = 'FreshPassword456!';

    await page.goto('/forgot-password');
    await page.getByRole('textbox', { name: /email address/i }).fill(account.email);
    await page.getByRole('button', { name: 'Send Reset Instructions' }).click();
    await expect(page.getByRole('heading', { name: 'Check Your Email' })).toBeVisible({
      timeout: 15_000,
    });

    await expect
      .poll(async () => (await peekAuthTokens(account.email)).resetToken, { timeout: 15_000 })
      .not.toBeNull();
    const { resetToken } = await peekAuthTokens(account.email);
    const resetUrl = `/reset-password?token=${resetToken}`;
    const resetWith = async (password: string) => {
      await page.getByLabel('New Password', { exact: true }).fill(password);
      await page.getByLabel('Confirm New Password').fill(password);
      await page.getByRole('button', { name: 'Reset Password' }).click();
    };

    await page.goto(resetUrl);
    await resetWith(newPassword);
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

    // Reusing the same link is refused.
    await page.goto(resetUrl);
    await resetWith('AnotherPassword789!');
    await expect(page.getByText(/failed to reset password/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/reset-password/);

    // The old password is rejected in the UI; the new one works.
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill(account.email);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(account.password);
    await page
      .getByRole('button', { name: /^(sign in|log ?in)$/i })
      .first()
      .click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);

    await loginViaUI(page, account.email, newPassword);
    await expect(page.getByRole('button', userMenuFor(account))).toBeVisible({ timeout: 15_000 });
  });

  // CLI-010
  test('the session survives a refresh and is shared with a second tab', async ({ page }) => {
    const account = await createVerifiedAdopter('session');
    await loginViaUI(page, account.email, account.password);
    await expect(page.getByRole('button', userMenuFor(account))).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByRole('button', userMenuFor(account))).toBeVisible({ timeout: 15_000 });

    const second = await page.context().newPage();
    await second.goto('/applications');
    await expect(second.getByRole('button', userMenuFor(account))).toBeVisible({
      timeout: 15_000,
    });
    await expect(second.getByText(/login required/i)).toHaveCount(0);
  });
});
