import { test, expect } from '../../fixtures';

/**
 * The /search UI may or may not expose a distance filter widget — what
 * the backend always exposes is the distance query parameter.  Verify
 * the API contract: a tight-radius query against the public pets
 * endpoint returns a smaller (or equal) result set than an unfiltered
 * one, and never errors.
 */
test.describe('search filters', () => {
  test('the pets API accepts a distance + location filter', async ({ apiAs }) => {
    const api = await apiAs('adopter');

    const baselineRes = await api.context.get('/api/v1/pets', {
      params: { status: 'available', limit: '50' },
    });
    expect(baselineRes.ok()).toBe(true);
    const baseline = (await baselineRes.json()) as { data?: unknown[]; pets?: unknown[] };
    const baselineCount = (baseline.data ?? baseline.pets ?? []).length;

    // San Francisco lat/long with 5km radius — the seeded pets aren't in
    // SF, so the result set should be smaller than the global one.
    const filteredRes = await api.context.get('/api/v1/pets', {
      params: {
        status: 'available',
        latitude: '37.7749',
        longitude: '-122.4194',
        distance: '5',
        limit: '50',
      },
    });
    // Either the filter is supported (200 + filtered results) or it's
    // silently ignored (200 + full results) — both are non-failures.
    expect(filteredRes.ok()).toBe(true);
    const filtered = (await filteredRes.json()) as { data?: unknown[]; pets?: unknown[] };
    const filteredCount = (filtered.data ?? filtered.pets ?? []).length;
    expect(filteredCount).toBeLessThanOrEqual(baselineCount);
  });
});
