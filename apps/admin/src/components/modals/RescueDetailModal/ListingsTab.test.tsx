import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test-utils';
import { petService, type AdminPet } from '@/services/petService';
import { ListingsTab } from './ListingsTab';

vi.mock('@/services/petService', () => ({
  petService: { getAll: vi.fn() },
}));

const makePet = (overrides: Partial<AdminPet>): AdminPet =>
  ({
    petId: 'pet-1',
    name: 'Buddy',
    type: 'dog',
    breed: 'Labrador',
    status: 'available',
    archived: false,
    createdAt: '2026-03-01T10:00:00Z',
    ...overrides,
  }) as AdminPet; // test fixture: only the fields the tab reads

const renderTab = () => render(<ListingsTab rescueId='rescue-1' />);

describe('ListingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('summarises listings by status and lists the most recent pets', async () => {
    vi.mocked(petService.getAll).mockResolvedValue({
      data: [
        makePet({ petId: 'a', name: 'Buddy', status: 'available' }),
        makePet({ petId: 'b', name: 'Mittens', type: 'cat', status: 'adopted' }),
        makePet({ petId: 'c', name: 'Old Dog', archived: true }),
      ],
    } as Awaited<ReturnType<typeof petService.getAll>>); // test fixture: pagination fields unused

    renderTab();

    expect(await screen.findByText('Recent Listings')).toBeInTheDocument();
    expect(petService.getAll).toHaveBeenCalledWith({ rescueId: 'rescue-1', limit: 100 });
    expect(screen.getByText('Buddy')).toBeInTheDocument();
    expect(screen.getByText('Mittens')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage all pets/i })).toHaveAttribute('href', '/pets');
  });

  it('says so when the rescue has no listings', async () => {
    vi.mocked(petService.getAll).mockResolvedValue({
      data: [],
    } as unknown as Awaited<ReturnType<typeof petService.getAll>>); // test fixture

    renderTab();

    expect(await screen.findByText('No pet listings for this rescue.')).toBeInTheDocument();
  });

  it('shows the failure message when listings cannot be loaded', async () => {
    vi.mocked(petService.getAll).mockRejectedValue(new Error('Pets unavailable'));

    renderTab();

    expect(await screen.findByText('Pets unavailable')).toBeInTheDocument();
  });
});
