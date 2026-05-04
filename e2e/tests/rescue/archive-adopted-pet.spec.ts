import { test, expect } from '../../fixtures';
import { createAvailablePet, expectOk, setPetStatus } from '../../helpers/seeds';

/**
 * Archiving means moving a pet from 'available' to 'adopted'.  Drive
 * via the rescue API (which the rescue UI uses internally), then verify
 * the change shows up on a re-read.
 */
test.describe('archiving an adopted pet', () => {
  test('a rescue can archive a pet by setting status to adopted', async ({ apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const pet = await createAvailablePet(rescueApi, 'Archive');

    await setPetStatus(rescueApi, pet.petId, 'adopted');

    const res = await rescueApi.context.get(`/api/v1/pets/${pet.petId}`);
    await expectOk(res, `GET /pets/${pet.petId}`);
    const body = (await res.json()) as {
      status?: string;
      data?: { status?: string };
    };
    const status = body.status ?? body.data?.status;
    expect(status).toBe('adopted');
  });
});
