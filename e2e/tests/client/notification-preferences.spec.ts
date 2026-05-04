import { test, expect } from '../../fixtures';
import { expectOk, putWithCsrf } from '../../helpers/seeds';

/**
 * UserService.updateUserPreferences accepts either:
 *   { emailNotifications: boolean }                  // top-level
 *   { notificationPreferences: { emailNotifications: boolean } }
 * and returns the prefs in the top-level "emailNotifications" shape.
 *
 * The seeder 31-e2e-fixtures.ts pre-creates a UserNotificationPrefs
 * row for John Smith.  This test round-trips a flip through the API.
 */
test.describe('notification preferences', () => {
  test('an adopter can toggle email notifications via API and the change persists', async ({
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');

    const beforeRes = await adopterApi.context.get('/api/v1/users/preferences');
    await expectOk(beforeRes, 'GET /users/preferences (initial)');
    const before = (await beforeRes.json()) as Record<string, unknown> & {
      data?: Record<string, unknown>;
    };
    const initialPrefs = (before.data ?? before) as Record<string, unknown>;
    const initialEmail = readEmailEnabled(initialPrefs) ?? true;

    const flipRes = await putWithCsrf(adopterApi.context, '/api/v1/users/preferences', {
      emailNotifications: !initialEmail,
    });
    await expectOk(flipRes, 'PUT /users/preferences (flip)');

    const afterRes = await adopterApi.context.get('/api/v1/users/preferences');
    await expectOk(afterRes, 'GET /users/preferences (after flip)');
    const after = (await afterRes.json()) as Record<string, unknown> & {
      data?: Record<string, unknown>;
    };
    const finalPrefs = (after.data ?? after) as Record<string, unknown>;
    expect(readEmailEnabled(finalPrefs)).toBe(!initialEmail);

    // Restore so the suite is repeatable.
    await putWithCsrf(adopterApi.context, '/api/v1/users/preferences', {
      emailNotifications: initialEmail,
    });
  });
});

function readEmailEnabled(prefs: Record<string, unknown>): boolean | undefined {
  if (typeof prefs.emailNotifications === 'boolean') {
    return prefs.emailNotifications;
  }
  if (typeof prefs.email_enabled === 'boolean') {
    return prefs.email_enabled;
  }
  if (typeof prefs.emailEnabled === 'boolean') {
    return prefs.emailEnabled;
  }
  const np = prefs.notificationPreferences as Record<string, unknown> | undefined;
  if (np && typeof np.emailNotifications === 'boolean') {
    return np.emailNotifications;
  }
  return undefined;
}
