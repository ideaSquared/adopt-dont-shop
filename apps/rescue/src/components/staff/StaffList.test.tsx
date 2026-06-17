import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import type { StaffMember } from '../../types/staff';
import StaffList from './StaffList';

/**
 * Behaviour tests for the staff list and its cards. Staff management lets a
 * rescue admin search, filter by verification status, and edit/remove
 * colleagues — but never themselves.
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
    expect(screen.getByText('Showing 2 of 2 staff members')).toBeInTheDocument();
  });

  it('filters the list by search term', () => {
    render(
      <StaffList
        staff={[member(), member({ id: 's2', userId: 'su2', firstName: 'Bob', lastName: 'Lee' })]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search staff members...'), {
      target: { value: 'bob' },
    });

    expect(screen.queryByText('Sarah Johnson')).not.toBeInTheDocument();
    expect(screen.getByText('Bob Lee')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 2 staff members')).toBeInTheDocument();
  });

  it('filters by verification status', () => {
    render(
      <StaffList
        staff={[
          member(),
          member({ id: 's2', userId: 'su2', firstName: 'Pending', isVerified: false }),
        ]}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pending' } });

    expect(screen.queryByText('Sarah Johnson')).not.toBeInTheDocument();
    expect(screen.getByText('Pending Johnson')).toBeInTheDocument();
  });

  it('shows the no-results empty state when a search matches nothing', () => {
    render(<StaffList staff={[member()]} />);

    fireEvent.change(screen.getByPlaceholderText('Search staff members...'), {
      target: { value: 'zzz' },
    });

    expect(screen.getByText('No Results Found')).toBeInTheDocument();
  });

  it('invokes edit and remove handlers for other staff when permitted', () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    render(<StaffList staff={[member()]} canEdit canRemove onEdit={onEdit} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('hides edit/remove actions for the current user to prevent self-management', () => {
    render(<StaffList staff={[member({ userId: 'me' })]} canEdit canRemove currentUserId="me" />);

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('shows a verification badge reflecting each member status', () => {
    render(
      <StaffList
        staff={[
          member(),
          member({ id: 's2', userId: 'su2', firstName: 'Unverified', isVerified: false }),
        ]}
      />
    );

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});
