import { test, expect } from '../../fixtures';
import { expectOk, putWithCsrf } from '../../helpers/seeds';

/**
 * The seeder 31-e2e-fixtures.ts pre-creates a UserNotificationPrefs row
 * for John Smith.  Round-trip a flip through the preferences API.
 *
 * The PUT body shape mirrors what UserService.updateUserPreferences
 * accepts: top-level keys for each preference category.  We send a
 * minimal payload (`emailEnabled`) and then read the stored value back.
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

    // Flip — try the typed top-level shape first; if that's rejected,
    // fall back to the nested shape some builds expect.
    let flipRes = await putWithCsrf(adopterApi.context, '/api/v1/users/preferences', {
      emailEnabled: !initialEmail,
    });
    if (!flipRes.ok()) {
      flipRes = await putWithCsrf(adopterApi.context, '/api/v1/users/preferences', {
        notifications: { email: !initialEmail },
      });
    }
    await expectOk(flipRes, 'PUT /users/preferences (flip)');

    // Read back.
    const afterRes = await adopterApi.context.get('/api/v1/users/preferences');
    await expectOk(afterRes, 'GET /users/preferences (after flip)');
    const after = (await afterRes.json()) as Record<string, unknown> & {
      data?: Record<string, unknown>;
    };
    const finalPrefs = (after.data ?? after) as Record<string, unknown>;
    const flippedEmail = readEmailEnabled(finalPrefs);
    expect(flippedEmail).toBe(!initialEmail);

    // Restore so the suite is repeatable — best-effort, ignore failures.
    await putWithCsrf(adopterApi.context, '/api/v1/users/preferences', {
      emailEnabled: initialEmail,
    });
  });
});

function readEmailEnabled(prefs: Record<string, unknown>): boolean | undefined {
  if (typeof prefs.emailEnabled === 'boolean') {
    return prefs.emailEnabled;
  }
  if (typeof prefs.email_enabled === 'boolean') {
    return prefs.email_enabled;
  }
  const notifications = prefs.notifications as Record<string, unknown> | undefined;
  if (notifications && typeof notifications.email === 'boolean') {
    return notifications.email;
  }
  return undefined;
}
