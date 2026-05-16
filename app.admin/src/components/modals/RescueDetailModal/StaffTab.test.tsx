import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import { StaffTab } from './StaffTab';

vi.mock('@/services/rescueService', () => ({
  rescueService: {
    getStaff: vi.fn(),
    getInvitations: vi.fn(),
    inviteStaff: vi.fn(),
    removeStaff: vi.fn(),
    cancelInvitation: vi.fn(),
  },
}));

import { rescueService } from '@/services/rescueService';

const mockGetStaff = vi.mocked(rescueService.getStaff);
const mockGetInvitations = vi.mocked(rescueService.getInvitations);
const mockInviteStaff = vi.mocked(rescueService.inviteStaff);

const buildStaffMember = (overrides = {}) => ({
  staffMemberId: 'sm-1',
  userId: 'user-1',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  title: 'Coordinator',
  isVerified: true,
  addedAt: new Date().toISOString(),
  ...overrides,
});

const buildInvitation = (overrides = {}) => ({
  invitationId: 1,
  email: 'newstaff@example.com',
  title: 'Volunteer',
  status: 'pending',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStaff.mockResolvedValue({ data: [], pagination: { page: 1, pages: 1, total: 0 } });
  mockGetInvitations.mockResolvedValue([]);
});

describe('StaffTab', () => {
  it('renders loading skeleton while fetching staff', () => {
    mockGetStaff.mockReturnValue(new Promise(() => {}));
    mockGetInvitations.mockReturnValue(new Promise(() => {}));

    render(<StaffTab rescueId='rescue-1' />);
    expect(screen.getByLabelText('Loading staff')).toBeInTheDocument();
  });

  it('renders empty state when there are no staff or invitations', async () => {
    render(<StaffTab rescueId='rescue-1' />);
    expect(
      await screen.findByText('No staff members yet. Invite your first team member!')
    ).toBeInTheDocument();
  });

  it('renders staff member list', async () => {
    mockGetStaff.mockResolvedValue({
      data: [buildStaffMember()],
      pagination: { page: 1, pages: 1, total: 1 },
    });

    render(<StaffTab rescueId='rescue-1' />);
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('renders pending invitations', async () => {
    mockGetInvitations.mockResolvedValue([buildInvitation()]);

    render(<StaffTab rescueId='rescue-1' />);
    expect(await screen.findByText('newstaff@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pending Invitations (1)')).toBeInTheDocument();
  });

  it('shows the invite form when Invite Staff is clicked', async () => {
    render(<StaffTab rescueId='rescue-1' />);
    await screen.findByText('No staff members yet. Invite your first team member!');

    fireEvent.click(screen.getByRole('button', { name: /invite staff/i }));
    expect(screen.getByLabelText('Email Address *')).toBeInTheDocument();
  });

  it('hides the invite form when Cancel is clicked', async () => {
    render(<StaffTab rescueId='rescue-1' />);
    await screen.findByText('No staff members yet. Invite your first team member!');

    fireEvent.click(screen.getByRole('button', { name: /invite staff/i }));
    expect(screen.getByLabelText('Email Address *')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Email Address *')).not.toBeInTheDocument();
  });

  it('calls inviteStaff with email and title when Send Invitation is clicked', async () => {
    mockInviteStaff.mockResolvedValue(undefined);

    render(<StaffTab rescueId='rescue-1' />);
    await screen.findByText('No staff members yet. Invite your first team member!');

    fireEvent.click(screen.getByRole('button', { name: /invite staff/i }));
    fireEvent.change(screen.getByLabelText('Email Address *'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Job Title (Optional)'), {
      target: { value: 'Vet' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() => {
      expect(mockInviteStaff).toHaveBeenCalledWith('rescue-1', {
        email: 'new@example.com',
        title: 'Vet',
      });
    });
  });
});
