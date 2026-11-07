import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { transitionPetStatus } from '../../helpers/pet-status';
import { createAvailablePet, postWithCsrf } from '../../helpers/seeds';

/**
 * A pet that is viewable but NOT available for adoption must not offer the
 * adopter an "Apply to Adopt" control. PetDetailsPage only renders the CTA when
 * `pet.status === 'available'`.
 *
 * The pets are created fresh and moved to `pending` through the status route, so
 * the case under test is known rather than whichever seeded pet happens to be
 * unavailable. An available pet on the same page is the control: it proves the
 * CTA locator finds the button when it should.
 *
 * Adopted / not_available / deceased pets are hidden from public callers by the
 * pets service (PUBLIC_HIDDEN_STATUSES) and 404 to "Pet Not Found", so there is
 * no detail page to gate; `pending` is the viewable-but-unavailable case.
 */
test.describe('availability gating', () => {
  const applyControl = (page: Page) =>
    page
      .getByRole('link', { name: /apply (to|for) adopt/i })
      .or(page.getByRole('button', { name: /apply (to|for) adopt/i }));

  test('a pending pet shows its status and no Apply control, an available pet does', async ({
    page,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const available = await createAvailablePet(rescueApi, 'GateOpen');
    const pending = await createAvailablePet(rescueApi, 'GateShut');
    await transitionPetStatus(rescueApi, pending.petId, 'pending');

    await page.goto(`/pets/${available.petId}`);
    await expect(page.getByRole('heading', { level: 1, name: available.name })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Available for Adoption')).toBeVisible();
    await expect(applyControl(page)).toBeVisible();

    await page.goto(`/pets/${pending.petId}`);
    await expect(page.getByRole('heading', { level: 1, name: pending.name })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Adoption Pending')).toBeVisible();
    // The rest of the actions render, so a missing Apply is the gate, not a half-loaded page.
    await expect(page.getByText(/ask a question before applying/i)).toBeVisible();
    await expect(applyControl(page)).toHaveCount(0);
  });

  // KNOWN APP BUG: only the pet page hides the CTA. POST /api/v1/applications accepts an
  // application for a pending pet (201 submitted), so the rule is not enforced server-side
  // and /apply/:petId still works by URL. Remove test.fail when the service refuses it.
  test('the API refuses an application for a pet that is not available', async ({ apiAs }) => {
    test.fail(true, 'POST /applications returns 201 for a pending pet');
    const rescueApi = await apiAs('rescue');
    const pending = await createAvailablePet(rescueApi, 'GateApi');
    await transitionPetStatus(rescueApi, pending.petId, 'pending');
    const adopterApi = await loginAccountViaApi(await createVerifiedAdopter('gate-api'));
    try {
      const res = await postWithCsrf(adopterApi.context, '/api/v1/applications', {
        petId: pending.petId,
        answers: {},
        referencesConsented: true,
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    } finally {
      await adopterApi.dispose();
    }
  });
});
