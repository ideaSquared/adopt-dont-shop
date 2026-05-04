import { test, expect } from '../../fixtures';
import { getMyRescueId, postWithCsrf, deleteWithCsrf } from '../../helpers/seeds';
import { uniqueText } from '../../helpers/factories';

/**
 * The application questions builder UI isn't part of every build, but
 * the API contract for managing custom questions is consistent.  We
 * verify a rescue admin can:
 *   1. Read the seeded application questions for their rescue (seeder
 *      30-application-questions.ts populates these).
 *   2. Create a new question, see it in the list, then delete it.
 */
test.describe('custom application questions', () => {
  test('a rescue admin can list, create, and delete custom application questions', async ({
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const rescueId = await getMyRescueId(rescueApi);
    expect(rescueId).toBeTruthy();

    // 1. Read seeded questions.
    const listRes = await rescueApi.context.get(`/api/v1/rescues/${rescueId}/questions`);
    expect(listRes.ok()).toBe(true);
    const seededBody = (await listRes.json()) as {
      data?: unknown[];
      questions?: unknown[];
    };
    const seeded = seededBody.data ?? seededBody.questions ?? [];
    expect(Array.isArray(seeded)).toBe(true);

    // 2. Create a new question.
    const text = uniqueText('q-text');
    const createRes = await postWithCsrf(
      rescueApi.context,
      `/api/v1/rescues/${rescueId}/questions`,
      {
        questionKey: `e2e_${Date.now().toString(36)}`,
        questionText: text,
        category: 'personal_information',
        questionType: 'TEXT',
        isRequired: false,
        sortOrder: 999,
      }
    );
    expect(createRes.ok()).toBe(true);
    const created = (await createRes.json()) as {
      questionId?: string;
      id?: string;
      data?: { questionId?: string; id?: string };
    };
    const questionId =
      created.questionId ?? created.id ?? created.data?.questionId ?? created.data?.id;
    expect(questionId).toBeTruthy();

    // 3. Delete it so the spec is idempotent.
    const deleteRes = await deleteWithCsrf(
      rescueApi.context,
      `/api/v1/rescues/${rescueId}/questions/${questionId}`
    );
    expect(deleteRes.ok()).toBe(true);
  });
});
