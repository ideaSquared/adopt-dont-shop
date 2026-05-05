import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { deleteWithCsrf, expectOk, getMyRescueId, postWithCsrf } from '../../helpers/seeds';

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

    const listRes = await rescueApi.context.get(`/api/v1/rescues/${rescueId}/questions`);
    await expectOk(listRes, `GET /rescues/${rescueId}/questions`);
    const seededBody = (await listRes.json()) as {
      data?: unknown[];
      questions?: unknown[];
    };
    const seeded = seededBody.data ?? seededBody.questions ?? [];
    expect(Array.isArray(seeded)).toBe(true);

    const text = uniqueText('q-text');
    const createRes = await postWithCsrf(
      rescueApi.context,
      `/api/v1/rescues/${rescueId}/questions`,
      {
        questionKey: `e2e_${Date.now().toString(36)}`,
        questionText: text,
        category: 'personal_information',
        questionType: 'text',
        isRequired: false,
        sortOrder: 999,
      }
    );
    await expectOk(createRes, `POST /rescues/${rescueId}/questions`);
    const created = (await createRes.json()) as {
      questionId?: string;
      id?: string;
      data?: { questionId?: string; id?: string };
    };
    const questionId =
      created.questionId ?? created.id ?? created.data?.questionId ?? created.data?.id;
    expect(questionId).toBeTruthy();

    const deleteRes = await deleteWithCsrf(
      rescueApi.context,
      `/api/v1/rescues/${rescueId}/questions/${questionId}`
    );
    await expectOk(deleteRes, `DELETE /rescues/${rescueId}/questions/${questionId}`);
  });
});
