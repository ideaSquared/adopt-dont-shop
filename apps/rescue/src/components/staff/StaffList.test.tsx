import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import type { StaffMember } from '../../types/staff';
import StaffList from './StaffList';

/**
 * Behaviour tests for the staff list and its rows. A rescue admin can remove
 * colleagues, but never themselves.
 */
const member = (overrides: Partial<StaffMember> = {}): StaffMember => ({
  id: 's1',
  userId: 'su1',
  rescueId: 'r1',
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'sarah@rescue.org',
  title: 'Manager',
  isVerified: true,
  addedAt: '2024-01-01',
  ...overrides,
});

describe('StaffList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a loading state while staff are being fetched', () => {
    render(<StaffList staff={[]} loading />);
    expect(screen.getByText('Loading staff members...')).toBeInTheDocument();
  });

  it('shows an empty state when the rescue has no staff', () => {
    render(<StaffList staff={[]} />);
    expect(screen.getByText('No Staff Members')).toBeInTheDocument();
  });

  it('renders a card per staff member with name, title and email', () => {
    render(
      <StaffList
        staff={[
          member(),
          member({
            id: 's2',
            userId: 'su2',
            firstName: 'Bob',
            lastName: 'Lee',
            title: 'Volunteer',
            email: 'bob@rescue.org',
          }),
        ]}
      />
    );

    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Lee')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByText('Volunteer')).toBeInTheDocument();
    expect(screen.getByText('sarah@rescue.org')).toBeInTheDocument();
  });

  it('identifies staff by name, not by their raw user id', () => {
    render(<StaffList staff={[member()]} />);

    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.queryByText('su1')).not.toBeInTheDocument();
  });

  it('invokes the remove handler for another member when permitted', () => {
    const onRemove = vi.fn();
    render(<StaffList staff={[member()]} canRemove onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Sarah Johnson' }));

    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('offers no remove button without permission', () => {
    render(<StaffList staff={[member()]} />);

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('hides the remove action for the current user to prevent self-removal', () => {
    render(<StaffList staff={[member({ userId: 'me' })]} canRemove currentUserId="me" />);

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});
