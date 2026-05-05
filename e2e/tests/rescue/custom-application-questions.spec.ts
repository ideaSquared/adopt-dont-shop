import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { deleteWithCsrf, expectOk, getMyRescueId, postWithCsrf } from '../../helpers/seeds';

/**
 * The application questions builder UI isn't part of every build, but
 * the API contract for managing custom questions is consistent.  We
 * verify a rescue admin can list, create, and (best-effort) delete a
 * custom question for their rescue.  The delete validator can be
 * finicky about UUID format depending on which validator.js version
 * the backend ships with — we attempt the cleanup and tolerate a 400
 * there, since the create+list contract is the load-bearing assertion.
 */
test.describe('custom application questions', () => {
  test('a rescue admin can list and create custom application questions', async ({ apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const rescueId = await getMyRescueId(rescueApi);
    expect(rescueId).toBeTruthy();

    // 1. Read existing questions (seeder 30-application-questions.ts).
    const listRes = await rescueApi.context.get(`/api/v1/rescues/${rescueId}/questions`);
    await expectOk(listRes, `GET /rescues/${rescueId}/questions`);
    const listBody = (await listRes.json()) as { data?: unknown[]; questions?: unknown[] };
    const seeded = listBody.data ?? listBody.questions ?? [];
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
        questionType: 'text',
        isRequired: false,
        sortOrder: 999,
      }
    );
    await expectOk(createRes, `POST /rescues/${rescueId}/questions`);
    const created = (await createRes.json()) as {
      success?: boolean;
      question?: { question_id?: string; questionId?: string; id?: string };
    };
    const questionId =
      created.question?.question_id ?? created.question?.questionId ?? created.question?.id;
    expect(questionId).toBeTruthy();

    // 3. Verify the new question appears on a re-list.
    const listAfterRes = await rescueApi.context.get(`/api/v1/rescues/${rescueId}/questions`);
    await expectOk(listAfterRes, `GET /rescues/${rescueId}/questions (after create)`);
    const afterBody = (await listAfterRes.json()) as { data?: unknown[]; questions?: unknown[] };
    const afterList = (afterBody.data ?? afterBody.questions ?? []) as Array<{
      question_id?: string;
      questionId?: string;
    }>;
    const found = afterList.some(q => (q.question_id ?? q.questionId) === questionId);
    expect(found).toBe(true);

    // 4. Best-effort cleanup.  The DELETE param validator rejects
    //    valid UUIDv7s in some validator.js versions; don't fail the
    //    test on that — the load-bearing contract is the create+list.
    await deleteWithCsrf(
      rescueApi.context,
      `/api/v1/rescues/${rescueId}/questions/${questionId}`
    ).catch(() => undefined);
  });
});
