import { test, expect } from '../../fixtures';
import { createAvailablePet, expectOk, postWithCsrf } from '../../helpers/seeds';

/**
 * Archiving takes a pet out of circulation while keeping its record: the
 * rescue still reads it (flagged archived, status untouched) and adopters can
 * no longer open it. It uses the same bulk-update route the rescue app's
 * Archive button calls; the button itself is driven in gap-pet-edit-archive.
 */
type PetView = { pet_id: string; status: string; archived: boolean };
type BulkResult = { data: { successCount: number; failedCount: number } };

test.describe('archiving a pet', () => {
  test('an adopted pet is archived and keeps its adopted status', async ({ apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const { petId } = await createAvailablePet(rescueApi, 'ArchiveAdopted');
    // A pet has to be pending before it can be adopted.
    for (const toStatus of ['pending', 'adopted']) {
      await expectOk(
        await postWithCsrf(rescueApi.context, `/api/v1/pets/${petId}/status`, { toStatus }),
        `mark the pet ${toStatus}`
      );
    }

    const archived = await postWithCsrf(rescueApi.context, '/api/v1/pets/bulk-update', {
      petIds: [petId],
      operation: 'archive',
    });
    await expectOk(archived, 'archive the pet');
    expect(((await archived.json()) as BulkResult).data).toMatchObject({
      successCount: 1,
      failedCount: 0,
    });

    const read = await rescueApi.context.get(`/api/v1/pets/${petId}`);
    await expectOk(read, `GET /pets/${petId}`);
    const { data: pet } = (await read.json()) as { data: PetView };
    expect(pet).toMatchObject({ pet_id: petId, status: 'adopted', archived: true });
  });

  test('an archived pet can no longer be opened by adopters', async ({ apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const adopterApi = await apiAs('adopter');
    const { petId } = await createAvailablePet(rescueApi, 'ArchiveHidden');
    expect((await adopterApi.context.get(`/api/v1/pets/${petId}`)).status()).toBe(200);

    const archived = await postWithCsrf(rescueApi.context, '/api/v1/pets/bulk-update', {
      petIds: [petId],
      operation: 'archive',
    });
    await expectOk(archived, 'archive the pet');

    expect((await adopterApi.context.get(`/api/v1/pets/${petId}`)).status()).toBe(404);
  });
});
