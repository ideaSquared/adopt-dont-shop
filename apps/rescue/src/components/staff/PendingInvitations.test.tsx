import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import type { PendingInvitation } from '@adopt-dont-shop/lib.invitations';
import PendingInvitations from './PendingInvitations';

/**
 * Behaviour tests for the pending staff invitations panel. It lists outstanding
 * invites, highlights ones that are about to expire, and lets a permitted admin
 * cancel an invitation. Expiry is time-relative, so we pin the clock.
 */
const invitation = (overrides: Partial<PendingInvitation> = {}): PendingInvitation => ({
  invitation_id: 1,
  email: 'invitee@rescue.org',
  title: 'Volunteer',
  created_at: '2024-06-01T00:00:00Z',
  expiration: '2024-06-10T00:00:00Z',
  ...overrides,
});

describe('PendingInvitations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-05T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading state', () => {
    render(<PendingInvitations invitations={[]} loading />);
    expect(screen.getByText('Loading invitations...')).toBeInTheDocument();
  });

  it('shows the empty state when there are no invitations', () => {
    render(<PendingInvitations invitations={[]} />);
    expect(screen.getByText('No Pending Invitations')).toBeInTheDocument();
    expect(screen.getByText('No pending invitations')).toBeInTheDocument();
  });

  it('lists invitations with the recipient email and a count summary', () => {
    render(
      <PendingInvitations
        invitations={[invitation(), invitation({ invitation_id: 2, email: 'other@rescue.org' })]}
      />
    );

    expect(screen.getByText('invitee@rescue.org')).toBeInTheDocument();
    expect(screen.getByText('other@rescue.org')).toBeInTheDocument();
    expect(screen.getByText('2 pending invitations')).toBeInTheDocument();
  });

  it('marks invitations expiring within two days as expiring soon', () => {
    render(
      <PendingInvitations invitations={[invitation({ expiration: '2024-06-06T00:00:00Z' })]} />
    );

    expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
    expect(screen.getByText('1 day remaining')).toBeInTheDocument();
  });

  it('marks invitations with plenty of time as active', () => {
    render(
      <PendingInvitations invitations={[invitation({ expiration: '2024-06-20T00:00:00Z' })]} />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('15 days remaining')).toBeInTheDocument();
  });

  it('shows "Expires today" for an invitation that lapses now', () => {
    render(
      <PendingInvitations invitations={[invitation({ expiration: '2024-06-05T00:00:00Z' })]} />
    );

    expect(screen.getByText('Expires today')).toBeInTheDocument();
  });

  it('calls onCancel with the invitation id when cancellation is allowed', () => {
    const onCancel = vi.fn();
    render(
      <PendingInvitations
        invitations={[invitation({ invitation_id: 42 })]}
        canCancel
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledWith(42);
  });

  it('hides the cancel button when cancellation is not permitted', () => {
    render(<PendingInvitations invitations={[invitation()]} onCancel={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
