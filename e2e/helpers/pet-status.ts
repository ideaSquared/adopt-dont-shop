import type { ApiClient } from '../fixtures/api';
import { expectOk, postWithCsrf } from './seeds';

type PetStatus = 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care';

/**
 * Move a pet to another adoption status through the dedicated transition route
 * (POST /pets/:id/status). `PATCH /pets/:id` ignores a `status` field, so the
 * older `setPetStatus` seed helper leaves the pet where it was.
 */
export async function transitionPetStatus(
  staffApi: ApiClient,
  petId: string,
  toStatus: PetStatus
): Promise<void> {
  const res = await postWithCsrf(staffApi.context, `/api/v1/pets/${petId}/status`, {
    toStatus,
    reason: 'e2e availability gating',
  });
  await expectOk(res, `move pet to ${toStatus}`);
}
