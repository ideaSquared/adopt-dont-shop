import { test, expect } from '../../fixtures';
import {
  SEEDED_PET_IDS,
  createAdopterApplication,
  patchWithCsrf,
} from '../../helpers/seeds';

/**
 * Adoption golden path (ADS-420).
 *
 * The previous version of this suite stopped at navigation into
 * `/apply/:petId` — it covered the entry point but never verified that
 * a submission survives the full backend round trip and surfaces back
 * on the adopter's dashboard. This spec extends the journey end to end:
 *
 *   1. UI: from a pet detail page, the apply CTA reaches the form.
 *   2. API: an application is created and the rescue approves it.
 *   3. UI: the adopter's "My Applications" page reflects the approval.
 *
 * Steps 2–3 use the API + rescue role for the submission rather than
 * driving every per-rescue custom question through the DOM — that
 * surface varies per rescue config and is exercised by component tests.
 * The behavioural contract we care about here is "submit → review →
 * approve → adopter sees approved", and that is invariant.
 */
test.describe('adoption application submission', () => {
  test('the apply CTA on a pet detail page lands the adopter on the application form', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenSwipeOnboarding', 'true');
    });

    await page.goto(`/pets/${SEEDED_PET_IDS.available}`);
    await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });

    const apply = page
      .getByRole('link', { name: /apply (to|for) adopt/i })
      .or(page.getByRole('button', { name: /apply (to|for) adopt/i }))
      .first();
    await expect(apply).toBeVisible({ timeout: 15_000 });
    await apply.click();

    await expect(page).toHaveURL(/\/apply\//, { timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('full adoption journey: submit application → rescue approves → adopter sees approval', async ({
    page,
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');
    const rescueApi = await apiAs('rescue');

    // 1. Adopter submits a fresh application against a fresh pet so this
    //    test does not interfere with the seeded fixtures other specs
    //    rely on.
    const { applicationId } = await createAdopterApplication(adopterApi, rescueApi);

    // 2. Rescue staff transitions the application to approved. The
    //    backend's status endpoint is authoritative — the dashboard
    //    reads the persisted state from it.
    const approveRes = await patchWithCsrf(
      rescueApi.context,
      `/api/v1/applications/${applicationId}/status`,
      { status: 'approved' }
    );
    expect(approveRes.ok()).toBe(true);

    // 3. Adopter visits My Applications and sees the approved state.
    await page.goto('/applications', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading', { level: 1, name: /my applications/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/approved/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
