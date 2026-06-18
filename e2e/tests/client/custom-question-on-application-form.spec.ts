import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { SEEDED_PET_IDS, expectOk, getMyRescueId, postWithCsrf } from '../../helpers/seeds';

/**
 * UI-level coverage for the rescue custom-application-questions feature
 * (API + gateway routes from #1092). The rescue-side e2e
 * (rescue/custom-application-questions.spec.ts) proves the CRUD contract;
 * this spec proves the OTHER half — the adopter's application form actually
 * fetches GET /api/v1/rescues/:id/questions and renders the rescue's custom
 * question as a form field.
 *
 * apps/client ApplicationPage loads the pet, then the owning rescue's
 * questions, filters to enabled, and groups them into macro-steps. A
 * `personal_information` question lands on the first guided step, so it is
 * visible on the form without navigating step-by-step.
 *
 * We attach the question to the rescue that owns the seeded available pet
 * (Buddy) so the adopter's /apply/:petId form for that pet renders it.
 */
test.describe('custom application question on the adopter form', () => {
  test('a custom question added by the rescue renders on the application form', async ({
    page,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const rescueId = await getMyRescueId(rescueApi);
    expect(rescueId).toBeTruthy();

    // The seeded available pet (Buddy) belongs to the rescue persona's rescue
    // (Paws). Confirm that before relying on its /apply form to fetch the
    // rescue's questions — otherwise the question would render on a different
    // rescue's form.
    const petRes = await rescueApi.context.get(`/api/v1/pets/${SEEDED_PET_IDS.available}`);
    await expectOk(petRes, `GET /pets/${SEEDED_PET_IDS.available}`);
    const petBody = (await petRes.json()) as {
      rescueId?: string;
      rescue_id?: string;
      data?: { rescueId?: string; rescue_id?: string };
    };
    const petRescueId =
      petBody.rescueId ?? petBody.rescue_id ?? petBody.data?.rescueId ?? petBody.data?.rescue_id;
    expect(petRescueId).toBe(rescueId);

    // The rescue adds a required text question in personal_information, the
    // first macro-step — so it must render on the form's opening step.
    const questionText = uniqueText('Why this pet specifically?');
    const createRes = await postWithCsrf(
      rescueApi.context,
      `/api/v1/rescues/${rescueId}/questions`,
      {
        questionKey: `e2e_uiq_${Date.now().toString(36)}`,
        questionText,
        category: 'personal_information',
        questionType: 'text',
        isRequired: true,
        sortOrder: 998,
      }
    );
    await expectOk(createRes, `POST /rescues/${rescueId}/questions`);

    // The adopter opens the application form for that pet and sees the
    // rescue's custom question rendered as a field.
    await page.goto(`/apply/${SEEDED_PET_IDS.available}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await expect(page).toHaveURL(/\/apply\//, { timeout: 15_000 });
    await expect(page.getByText(questionText, { exact: false })).toBeVisible({ timeout: 20_000 });
  });
});
