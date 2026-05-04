import { test, expect } from '../../fixtures';
import { createAvailablePet, setPetStatus } from '../../helpers/seeds';

/**
 * Archiving means moving a pet from 'available' to 'adopted'.  Drive
 * via the rescue API (which the rescue UI uses internally), then verify
 * the change shows up in the rescue's pet list.
 */
test.describe('archiving an adopted pet', () => {
  test('a rescue can archive a pet by setting status to adopted', async ({ apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const pet = await createAvailablePet(rescueApi, 'Archive');

    await setPetStatus(rescueApi, pet.petId, 'adopted');

    // Verify by re-reading the pet detail.
    const res = await rescueApi.context.get(`/api/v1/pets/${pet.petId}`);
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      status?: string;
      data?: { status?: string };
    };
    const status = body.status ?? body.data?.status;
    expect(status).toBe('adopted');
  });
});
