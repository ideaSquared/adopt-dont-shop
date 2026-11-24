import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { toast } from '@adopt-dont-shop/lib.components';
import { renderWithProviders, screen, userEvent, waitFor } from '../test-utils';

/**
 * Adding staff goes through the email invitation flow only: the real page,
 * modal and invitation service run against MSW.
 */

const staffMember = {
  id: 's1',
  userId: 'su2',
  rescueId: 'rescue-1',
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'sarah@rescue.org',
  title: 'Manager',
  isVerified: true,
  addedAt: '2024-01-01',
};

vi.mock('../hooks/useStaff', () => ({
  useStaff: () => ({
    staff: [staffMember],
    loading: false,
    error: null,
    refetch: vi.fn(),
    removeStaffMember: vi.fn(),
    updateStaffMember: vi.fn(),
  }),
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { userId: 'su1' } }),
  useHasPermission: () => ({ allowed: true, isLoading: false }),
}));

import StaffManagement from './StaffManagement';

const invitationBodies: unknown[] = [];
let inviteResponse: () => Response = () =>
  HttpResponse.json({ success: true, data: { invitationId: 1 } });

const server = setupServer(
  http.get('*/api/v1/csrf-token', () => HttpResponse.json({ csrfToken: 'csrf' })),
  http.get('*/api/v1/rescues/rescue-1/invitations', () =>
    HttpResponse.json({ success: true, data: [] })
  ),
  http.post('*/api/v1/rescues/rescue-1/invitations', async ({ request }) => {
    invitationBodies.push(await request.json());
    return inviteResponse();
  })
);

beforeAll(() => server.listen({ onUnhandledFrame: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  invitationBodies.length = 0;
  inviteResponse = () => HttpResponse.json({ success: true, data: { invitationId: 1 } });
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('StaffManagement invitations', () => {
  it('invites a person by email and confirms success', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StaffManagement />);

    await user.click(screen.getByRole('button', { name: 'Invite Staff Member' }));
    await user.type(screen.getByLabelText(/email address/i), 'new@rescue.org');
    await user.click(screen.getByRole('button', { name: 'Send Invitation' }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Invitation sent to new@rescue.org!')
    );
    expect(invitationBodies).toEqual([{ email: 'new@rescue.org', title: '' }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an accessible error and keeps the form open when the invite fails', async () => {
    inviteResponse = () =>
      HttpResponse.json({ success: false, message: 'Already invited' }, { status: 409 });
    const user = userEvent.setup();
    renderWithProviders(<StaffManagement />);

    await user.click(screen.getByRole('button', { name: 'Invite Staff Member' }));
    await user.type(screen.getByLabelText(/email address/i), 'new@rescue.org');
    await user.click(screen.getByRole('button', { name: 'Send Invitation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already invited/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('offers no way to add staff by user ID', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StaffManagement />);

    expect(screen.queryByRole('button', { name: /existing user/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Invite Staff Member' }));
    expect(screen.queryByLabelText(/user id/i)).not.toBeInTheDocument();
  });
});
