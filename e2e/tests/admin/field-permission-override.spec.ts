import { test, expect } from '../../fixtures';

/**
 * Field permissions are exposed via the /api/v1/field-permissions API
 * (admin-only).  Even when the management UI isn't shipped, the read
 * endpoint should return the default permission map.
 */
test.describe('field permissions admin', () => {
  test('the field permissions defaults endpoint returns the permission map', async ({ apiAs }) => {
    const adminApi = await apiAs('admin');

    const res = await adminApi.context.get('/api/v1/field-permissions/defaults');
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { success?: boolean; data?: unknown };
    expect(body.success).toBe(true);
    expect(body.data).toBeTruthy();
    // The map keys are resource names — check at least one we expect.
    expect(JSON.stringify(body.data)).toMatch(/users|rescues|pets|applications/);
  });
});
