import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test-utils';
import { PlanTab } from './PlanTab';
import type { AdminRescue } from '@/types/rescue';

vi.mock('@/services/rescueService', () => ({
  rescueService: {
    updatePlan: vi.fn(),
  },
}));

import { rescueService } from '@/services/rescueService';

const mockUpdatePlan = vi.mocked(rescueService.updatePlan);

const buildRescue = (overrides: Partial<AdminRescue> = {}): AdminRescue =>
  ({
    rescueId: 'rescue-1',
    name: 'Happy Paws',
    status: 'verified',
    plan: 'free',
    planExpiresAt: null,
    planLimits: {
      maxStaffSeats: 3,
      maxActivePets: 10,
      analyticsHistoryDays: 30,
    },
    email: 'rescue@example.com',
    address: '1 High St',
    city: 'London',
    postcode: 'SW1A 1AA',
    createdAt: new Date().toISOString(),
    ...overrides,
  }) as AdminRescue;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlanTab', () => {
  it('renders the current plan', () => {
    render(
      <PlanTab
        rescueId='rescue-1'
        rescue={buildRescue({ plan: 'growth' })}
        onRescueUpdated={vi.fn()}
      />
    );
    expect(screen.getByText('growth')).toBeInTheDocument();
  });

  it('renders plan limits when available', () => {
    render(<PlanTab rescueId='rescue-1' rescue={buildRescue()} onRescueUpdated={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
  });

  it('save button is disabled when the selected plan matches the current plan', () => {
    render(
      <PlanTab
        rescueId='rescue-1'
        rescue={buildRescue({ plan: 'free' })}
        onRescueUpdated={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /save plan/i })).toBeDisabled();
  });

  it('save button is enabled after changing the plan', () => {
    render(
      <PlanTab
        rescueId='rescue-1'
        rescue={buildRescue({ plan: 'free' })}
        onRescueUpdated={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: /plan tier/i }), {
      target: { value: 'growth' },
    });
    expect(screen.getByRole('button', { name: /save plan/i })).not.toBeDisabled();
  });

  it('shows success message after saving', async () => {
    const onRescueUpdated = vi.fn();
    mockUpdatePlan.mockResolvedValue(buildRescue({ plan: 'growth' }));

    render(
      <PlanTab
        rescueId='rescue-1'
        rescue={buildRescue({ plan: 'free' })}
        onUpdate={vi.fn()}
        onRescueUpdated={onRescueUpdated}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: /plan tier/i }), {
      target: { value: 'growth' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save plan/i }));

    expect(await screen.findByText('Plan updated successfully.')).toBeInTheDocument();
    expect(onRescueUpdated).toHaveBeenCalled();
  });

  it('shows error message when save fails', async () => {
    mockUpdatePlan.mockRejectedValue(new Error('Network error'));

    render(
      <PlanTab
        rescueId='rescue-1'
        rescue={buildRescue({ plan: 'free' })}
        onRescueUpdated={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: /plan tier/i }), {
      target: { value: 'growth' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save plan/i }));

    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });
});
