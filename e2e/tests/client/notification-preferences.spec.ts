import { test, expect } from '../../fixtures';
import { putWithCsrf } from '../../helpers/seeds';

/**
 * The seeder 31-e2e-fixtures.ts pre-creates a UserNotificationPrefs row
 * for John Smith.  We round-trip the email_enabled flag through the
 * preferences API — read, flip, read back, restore.  No UI dependency.
 */
test.describe('notification preferences', () => {
  test('an adopter can toggle email notifications via API and the change persists', async ({
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');

    const beforeRes = await adopterApi.context.get('/api/v1/users/preferences');
    expect(beforeRes.ok()).toBe(true);
    const before = (await beforeRes.json()) as {
      data?: { notifications?: { email?: boolean }; emailEnabled?: boolean };
      notifications?: { email?: boolean };
      emailEnabled?: boolean;
    };
    const initialEmail =
      before.data?.notifications?.email ??
      before.data?.emailEnabled ??
      before.notifications?.email ??
      before.emailEnabled ??
      true;

    // Flip.
    const flipRes = await putWithCsrf(adopterApi.context, '/api/v1/users/preferences', {
      notifications: { email: !initialEmail },
    });
    expect(flipRes.ok()).toBe(true);

    // Read back.
    const afterRes = await adopterApi.context.get('/api/v1/users/preferences');
    expect(afterRes.ok()).toBe(true);
    const after = (await afterRes.json()) as {
      data?: { notifications?: { email?: boolean }; emailEnabled?: boolean };
      notifications?: { email?: boolean };
      emailEnabled?: boolean;
    };
    const flippedEmail =
      after.data?.notifications?.email ??
      after.data?.emailEnabled ??
      after.notifications?.email ??
      after.emailEnabled;
    expect(flippedEmail).toBe(!initialEmail);

    // Restore so the suite is repeatable.
    await putWithCsrf(adopterApi.context, '/api/v1/users/preferences', {
      notifications: { email: initialEmail },
    });
  });
});
