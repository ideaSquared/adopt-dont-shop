import { describe, expect, it } from 'vitest';
import { render, screen } from '../../test-utils';
import type { AdminPet } from '@/services/petService';
import { PetDetailPanel } from './PetDetailPanel';

const makePet = (overrides: Partial<AdminPet>): AdminPet =>
  ({
    petId: 'pet-1',
    name: 'Buddy',
    type: 'dog',
    breed: 'Labrador',
    status: 'available',
    archived: false,
    featured: false,
    rescueId: 'rescue-1',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-02T10:00:00Z',
    ...overrides,
  }) as AdminPet; // test fixture: only the fields the panel reads

describe('PetDetailPanel', () => {
  it('shows the pet name, breed and an Available badge', () => {
    render(<PetDetailPanel pet={makePet({})} onClose={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'Buddy' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Available');
  });

  it('shows Archived for an archived pet whatever its status', () => {
    render(<PetDetailPanel pet={makePet({ archived: true })} onClose={() => undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent('Archived');
  });

  it('shows Unavailable for statuses without a dedicated label', () => {
    render(<PetDetailPanel pet={makePet({ status: 'on_hold' })} onClose={() => undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent('Unavailable');
  });
});
