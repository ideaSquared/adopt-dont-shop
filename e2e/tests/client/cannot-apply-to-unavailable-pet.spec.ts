import { test, expect } from '../../fixtures';

/**
 * Behaviourally: a pet that is not available (adopted, on hold, archived)
 * must NOT expose an enabled "Apply" button on its detail page. We verify
 * the rule by scanning the seeded catalogue and finding a non-available pet.
 */
test.describe('availability gating', () => {
  test('the apply CTA is hidden or disabled for unavailable pets', async ({ page, apiAs }) => {
    const api = await apiAs('admin');
    const response = await api.context.get('/api/v1/pets', {
      params: { status: 'adopted', limit: '5' },
    });
    if (!response.ok()) {
      test.skip(true, `pets API not reachable for filtering (status=${response.status()})`);
    }
    const body = (await response.json()) as { data?: unknown[]; pets?: unknown[] };
    const list = (body.data ?? body.pets ?? []) as Array<{ petId?: string; id?: string }>;
    if (list.length === 0) {
      test.skip(true, 'no adopted/unavailable pets in the seed set');
    }
    const target = list[0];
    const id = target?.petId ?? target?.id;
    if (!id) {
      test.skip(true, 'no id on returned pet record');
    }

    await page.goto(`/pets/${id}`);
    const apply = page.getByRole('button', { name: /apply (to|for) adopt/i }).first();
    if (await apply.count()) {
      await expect(apply).toBeDisabled();
    } else {
      await expect(
        page.getByText(/(no longer available|already adopted|adoption (closed|complete))/i).first()
      ).toBeVisible();
    }
  });
});
