/**
 * Behavioral test for the admin bulk-update-users wire contract.
 *
 * The backend route lives at `POST /api/v1/users/bulk-update` and its
 * `BulkUserUpdateRequestSchema` (lib.validation) is strict about both keys
 * and key names: `{ userIds, updateData, reason }`. This test pins the
 * frontend service to that contract so a future rename can't silently
 * regress to the old broken shape (`/api/v1/admin/users/bulk-update` with
 * `{ user_ids, updates }`).
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

const postMock = vi.fn();
const patchMock = vi.fn();

vi.mock('../services/libraryServices', () => ({
  apiService: {
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    get: vi.fn(),
  },
}));

import { userManagementService } from '../services/userManagementService';

describe('userManagementService.bulkUpdateUsers — wire contract', () => {
  beforeEach(() => {
    postMock.mockReset();
    patchMock.mockReset();
    postMock.mockResolvedValue({ success: 2, failed: 0 });
  });

  it('POSTs to /api/v1/users/bulk-update (not the old /admin/users path)', async () => {
    await userManagementService.bulkUpdateUsers(
      ['11111111-1111-1111-1111-111111111111'],
      { status: 'active' },
      'reason'
    );

    expect(postMock).toHaveBeenCalledTimes(1);
    const [url] = postMock.mock.calls[0];
    expect(url).toBe('/api/v1/users/bulk-update');
  });

  it('sends the canonical { userIds, updateData, reason } payload keys', async () => {
    await userManagementService.bulkUpdateUsers(
      ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'],
      { status: 'inactive' },
      'Operator deactivated stale accounts'
    );

    const [, body] = postMock.mock.calls[0];
    expect(body).toEqual({
      userIds: ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'],
      updateData: { status: 'inactive' },
      reason: 'Operator deactivated stale accounts',
    });
  });

  it('does not use the old snake_case keys (user_ids / updates)', async () => {
    await userManagementService.bulkUpdateUsers(
      ['11111111-1111-1111-1111-111111111111'],
      { status: 'active' },
      'reason'
    );

    const [, body] = postMock.mock.calls[0];
    const bodyKeys = Object.keys(body as Record<string, unknown>);
    expect(bodyKeys).not.toContain('user_ids');
    expect(bodyKeys).not.toContain('updates');
  });

  it('does not use PATCH (backend route is POST)', async () => {
    await userManagementService.bulkUpdateUsers(['11111111-1111-1111-1111-111111111111'], {
      status: 'active',
    });

    expect(patchMock).not.toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it('forwards reason unchanged through the rename (ADS-651)', async () => {
    await userManagementService.bulkUpdateUsers(
      ['11111111-1111-1111-1111-111111111111'],
      { status: 'inactive' },
      'GDPR cleanup batch'
    );

    const [, body] = postMock.mock.calls[0];
    expect((body as { reason?: string }).reason).toBe('GDPR cleanup batch');
  });
});
