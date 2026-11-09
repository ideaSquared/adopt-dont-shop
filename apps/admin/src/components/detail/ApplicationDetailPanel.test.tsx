import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import type { AdminApplication } from '@/services/applicationService';
import { ApplicationDetailPanel } from './ApplicationDetailPanel';

vi.mock('../../hooks', () => ({
  useEntityActivity: () => ({ data: [], isLoading: false, error: null }),
}));

const application: AdminApplication = {
  applicationId: 'app-1',
  status: 'submitted',
  petId: 'pet-1',
  petName: 'Buddy',
  petType: 'dog',
  rescueId: 'rescue-1',
  rescueName: 'Happy Paws',
  applicantId: 'user-1',
  applicantName: 'Jane Doe',
  applicantEmail: 'jane@example.com',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
};

describe('ApplicationDetailPanel overview', () => {
  it('links the applicant, pet and rescue by name instead of showing their ids', () => {
    render(<ApplicationDetailPanel application={application} onClose={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Jane Doe' })).toHaveAttribute('href', '/users/user-1');
    expect(screen.getByRole('link', { name: 'Buddy' })).toHaveAttribute('href', '/pets/pet-1');
    expect(screen.getByRole('link', { name: 'Happy Paws' })).toHaveAttribute(
      'href',
      '/rescues/rescue-1'
    );
    expect(screen.queryByText('pet-1')).not.toBeInTheDocument();
    expect(screen.queryByText('rescue-1')).not.toBeInTheDocument();
  });
});
