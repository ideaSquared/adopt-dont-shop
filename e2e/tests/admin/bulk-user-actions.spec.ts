import { test, expect } from '../../fixtures';
import { patchWithCsrf } from '../../helpers/seeds';

/**
 * The bulk-action UI isn't part of every build (no row checkboxes), but
 * the per-user action endpoint that backs it is consistent: an admin
 * can suspend a user via PATCH /admin/users/:userId/action and read
 * back the new status.  This exercises the same admin write path the
 * UI bulk button would call once per row.
 */
test.describe('admin user actions', () => {
  test('an admin can suspend a user via the per-user action endpoint', async ({ apiAs }) => {
    const adminApi = await apiAs('admin');

    // Find a non-admin user to act on.  We deliberately don't act on
    // the seeded role users (john.smith / superadmin / rescue.manager)
    // because other tests depend on their state — pick a user other
    // than those.
    const usersRes = await adminApi.context.get('/api/v1/admin/users', {
      params: { limit: '50' },
    });
    expect(usersRes.ok()).toBe(true);
    const usersBody = (await usersRes.json()) as {
      data?: Array<{ userId?: string; id?: string; email?: string; userType?: string }>;
      users?: Array<{ userId?: string; id?: string; email?: string; userType?: string }>;
    };
    const list = usersBody.data ?? usersBody.users ?? [];
    const protectedEmails = new Set([
      'john.smith@gmail.com',
      'superadmin@adoptdontshop.dev',
      'rescue.manager@pawsrescue.dev',
    ]);
    const target = list.find(
      u => u.email && !protectedEmails.has(u.email) && u.userType !== 'admin'
    );
    expect(target).toBeTruthy();
    const userId = target!.userId ?? target!.id;
    expect(userId).toBeTruthy();

    // Suspend.
    const suspendRes = await patchWithCsrf(
      adminApi.context,
      `/api/v1/admin/users/${userId}/action`,
      { action: 'suspend', reason: 'e2e bulk-action probe' }
    );
    expect(suspendRes.ok()).toBe(true);

    // Re-read and confirm the user's status flipped.
    const detailRes = await adminApi.context.get(`/api/v1/admin/users/${userId}`);
    expect(detailRes.ok()).toBe(true);
    const detail = (await detailRes.json()) as {
      status?: string;
      data?: { status?: string };
      user?: { status?: string };
    };
    const newStatus = detail.status ?? detail.data?.status ?? detail.user?.status;
    expect(newStatus).toBe('suspended');

    // Restore so the suite is repeatable.
    await patchWithCsrf(adminApi.context, `/api/v1/admin/users/${userId}/action`, {
      action: 'reactivate',
      reason: 'e2e cleanup',
    });
  });
});
