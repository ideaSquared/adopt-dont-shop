import { test, expect } from '../../fixtures';

/**
 * The notification badge UI varies — sometimes it's an icon-only button,
 * sometimes a header link.  What's invariant is the API contract:
 *
 *   GET /api/v1/notifications/unread/count returns a number;
 *   POST /api/v1/notifications/read-all marks them all read and the
 *   subsequent count drops to zero.
 *
 * John Smith has at least one seeded notification (12-notifications.ts),
 * so the count starts non-zero on a fresh seed.
 */
test.describe('notification badge', () => {
  test('the unread notification count drops to zero after mark-all-read', async ({ apiAs }) => {
    const adopterApi = await apiAs('adopter');

    const beforeRes = await adopterApi.context.get('/api/v1/notifications/unread/count');
    expect(beforeRes.ok()).toBe(true);
    const beforeBody = (await beforeRes.json()) as { count?: number; data?: { count?: number } };
    const initialCount = beforeBody.count ?? beforeBody.data?.count ?? 0;
    expect(typeof initialCount).toBe('number');

    // POST mark-all-read.
    const csrfRes = await adopterApi.context.get('/api/v1/csrf-token');
    expect(csrfRes.ok()).toBe(true);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
    const markRes = await adopterApi.context.post('/api/v1/notifications/read-all', {
      headers: { 'x-csrf-token': csrfToken! },
    });
    expect([200, 204]).toContain(markRes.status());

    const afterRes = await adopterApi.context.get('/api/v1/notifications/unread/count');
    expect(afterRes.ok()).toBe(true);
    const afterBody = (await afterRes.json()) as { count?: number; data?: { count?: number } };
    const finalCount = afterBody.count ?? afterBody.data?.count ?? 0;
    expect(finalCount).toBe(0);
  });
});
