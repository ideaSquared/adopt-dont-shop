import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test-utils/render';

import type { Pet } from '@/services';

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return { ...actual, useAuth: () => ({ isAuthenticated: false }) };
});

vi.mock('@/contexts/FavoritesContext', () => ({
  useFavorites: () => ({ isFavorite: () => false }),
}));

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({ logEvent: vi.fn() }),
}));

import { PetCard } from './PetCard';

const makePet = (overrides: Partial<Pet> = {}): Pet =>
  ({
    pet_id: 'pet-1',
    name: 'Luna',
    type: 'dog',
    status: 'available',
    images: [],
    ...overrides,
  }) as Pet;

describe('PetCard status', () => {
  it.each([
    ['available', 'Available'],
    ['on_hold', 'On Hold'],
    ['medical_care', 'Medical Care'],
  ])('labels a %s pet as %s', (status, label) => {
    render(<PetCard pet={makePet({ status })} />);

    expect(screen.getByRole('status')).toHaveTextContent(label);
  });

  it('labels a pet with no status as Unknown', () => {
    render(<PetCard pet={makePet({ status: undefined })} />);

    expect(screen.getByRole('status')).toHaveTextContent('Unknown');
  });
});

describe('PetCard distance', () => {
  it('shows miles to one decimal place, including whole numbers', () => {
    render(<PetCard pet={makePet({ distance: 5 })} />);

    expect(screen.getByText('5.0 mi')).toBeInTheDocument();
  });

  it('shows no distance badge when the pet has no distance', () => {
    render(<PetCard pet={makePet()} />);

    expect(screen.queryByText(/ mi$/)).not.toBeInTheDocument();
  });
});
