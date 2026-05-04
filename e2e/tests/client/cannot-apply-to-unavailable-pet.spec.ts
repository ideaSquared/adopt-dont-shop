import { test, expect } from '../../fixtures';

/**
 * Behaviourally: a pet that is not available (adopted, on hold, archived)
 * must NOT expose an enabled "Apply" button on its detail page. We verify
 * the rule by scanning the seeded catalogue for any non-available pet —
 * status names vary across seeds, so we accept several.
 */
test.describe('availability gating', () => {
  test('the apply CTA is hidden or disabled for unavailable pets', async ({ page, apiAs }) => {
    const api = await apiAs('admin');
    let target: { petId?: string; id?: string; pet_id?: string; status?: string } | undefined;

    for (const status of ['adopted', 'on_hold', 'medical_care', 'pending']) {
      const response = await api.context.get('/api/v1/pets', {
        params: { status, limit: '5' },
      });
      if (!response.ok()) {
        continue;
      }
      const body = (await response.json()) as { data?: unknown[]; pets?: unknown[] };
      const list = (body.data ?? body.pets ?? []) as Array<typeof target>;
      if (list.length > 0) {
        target = list[0];
        break;
      }
    }
    if (!target) {
      test.skip(true, 'no non-available pets in the seed set');
    }
    const id = target!.petId ?? target!.id ?? target!.pet_id;
    if (!id) {
      test.skip(true, 'no id on the returned pet record');
    }

    await page.goto(`/pets/${id}`);
    // The page should mount even if the pet is unavailable.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });

    const apply = page.getByRole('button', { name: /apply (to|for) adopt/i }).first();
    if (await apply.count()) {
      await expect(apply).toBeDisabled();
    } else {
      // No apply CTA at all is also acceptable behaviour for unavailable pets.
      await expect(apply).toHaveCount(0);
    }
  });
});
