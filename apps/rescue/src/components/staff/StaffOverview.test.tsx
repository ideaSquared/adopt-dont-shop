import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import type { StaffMember } from '../../types/staff';
import StaffOverview from './StaffOverview';

/**
 * Behaviour tests for the staff overview summary cards. It tallies total /
 * verified / pending counts, computes a verification rate, and surfaces the
 * most common role titles so an admin can see team composition at a glance.
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
  addedAt: new Date().toISOString(),
  ...overrides,
});

describe('StaffOverview', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders skeletons while loading', () => {
    const { container } = render(<StaffOverview staff={[]} loading />);
    // No summary numbers should appear while loading.
    expect(screen.queryByText('Total Staff')).not.toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it('shows the empty message when there are no staff', () => {
    render(<StaffOverview staff={[]} />);
    expect(screen.getByText('No Staff Members Yet')).toBeInTheDocument();
    expect(screen.getByText('0% of staff members are verified')).toBeInTheDocument();
  });

  it('tallies total, verified and pending counts with a verification rate', () => {
    render(
      <StaffOverview
        staff={[
          member(),
          member({ id: 's2', userId: 'su2', isVerified: true }),
          member({ id: 's3', userId: 'su3', isVerified: false }),
          member({ id: 's4', userId: 'su4', isVerified: false }),
        ]}
      />
    );

    expect(screen.getByText('Total Staff').previousSibling).toHaveTextContent('4');
    expect(screen.getByText('Verified').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('Pending').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('50% of staff members are verified')).toBeInTheDocument();
  });

  it('lists the most common role titles', () => {
    render(
      <StaffOverview
        staff={[
          member({ id: 's1', userId: 'su1', title: 'Manager' }),
          member({ id: 's2', userId: 'su2', title: 'Manager' }),
          member({ id: 's3', userId: 'su3', title: 'Volunteer' }),
        ]}
      />
    );

    expect(screen.getByText('Role Distribution')).toBeInTheDocument();
    const manager = screen.getByText('Manager');
    expect(manager.nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Volunteer')).toBeInTheDocument();
  });
});
