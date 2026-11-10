import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import type { AdminRescue } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import { RescueDetailPanel } from './RescueDetailPanel';

vi.mock('@/services/rescueService', () => ({
  rescueService: { getById: vi.fn() },
}));

const rescue = {
  rescueId: 'rescue-1',
  name: 'Happy Paws',
  status: 'verified',
  createdAt: '2026-01-05T10:00:00Z',
} as AdminRescue; // test fixture: only the fields the panel header renders

describe('RescueDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the rescue with statistics and shows its name, status and registration date', async () => {
    vi.mocked(rescueService.getById).mockResolvedValue(rescue);

    render(<RescueDetailPanel rescueId='rescue-1' onClose={() => undefined} />);

    expect(screen.getByLabelText('Loading rescue details')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Happy Paws' })).toBeInTheDocument();
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    expect(screen.getByText(/Registered 05 Jan 2026/)).toBeInTheDocument();
    expect(rescueService.getById).toHaveBeenCalledWith('rescue-1', { includeStats: true });
  });

  it('shows the failure message when the rescue cannot be loaded', async () => {
    vi.mocked(rescueService.getById).mockRejectedValue(new Error('Rescue not found'));

    render(<RescueDetailPanel rescueId='rescue-1' onClose={() => undefined} />);

    expect(await screen.findByText('Rescue not found')).toBeInTheDocument();
  });
});
