/**
 * Behaviour tests for the rescue PetCard component.
 *
 * Documents:
 *   - ADS-644: the foster status badge is a link to /foster?petId=... when
 *     the pet is in foster, and a non-interactive badge otherwise. This is
 *     the cross-link path staff use to jump from a pet to its placement.
 */

import type { Pet } from '@adopt-dont-shop/lib.pets';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../test-utils/render';
import PetCard from './PetCard';

const buildPet = (overrides: Partial<Pet> = {}): Pet => {
  // Pet has many backend fields the card never reads. Justified assertion:
  // keep the fixture focused on the fields exercised by the render path.
  const base = {
    pet_id: 'pet-1',
    name: 'Buddy',
    type: 'dog',
    status: 'available',
    breed: 'Labrador',
    gender: 'male',
    size: 'medium',
    adoption_fee: 0,
    age_years: 3,
    age_months: 0,
    images: [],
  } as unknown as Pet;
  return { ...base, ...overrides };
};

describe('PetCard foster cross-link (ADS-644)', () => {
  it('renders the foster status as a link to the pet-scoped foster page', () => {
    renderWithProviders(
      <PetCard
        pet={buildPet({ status: 'foster' })}
        onStatusChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const link = screen.getByRole('link', { name: /foster placement for buddy/i });
    expect(link).toHaveAttribute('href', '/foster?petId=pet-1');
    expect(link).toHaveTextContent('Foster');
  });

  it('does not render a foster link when the pet is not in foster', () => {
    renderWithProviders(
      <PetCard
        pet={buildPet({ status: 'available' })}
        onStatusChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByRole('link', { name: /foster placement/i })).toBeNull();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});
