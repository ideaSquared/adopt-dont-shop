/**
 * Behavioural tests for RescueDetailsPage.
 *
 * ADS-1200: the backend masks a rescue's contact/registration fields for
 * anonymous viewers (email / phone / address / contact_* / registration
 * numbers come back as '' or absent). The page must not render a broken
 * `mailto:` link or a blank Email row when those values are empty, while an
 * authenticated view that still receives the real values renders them as
 * before.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test-utils';
import type { Rescue, Pet, PaginatedResponse } from '@/services';

const getRescueMock = vi.fn();
const getPetsByRescueMock = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'rescue-1' }),
  };
});

vi.mock('@/services', () => ({
  rescueService: {
    getRescue: (...args: unknown[]) => getRescueMock(...args),
  },
  petService: {
    getPetsByRescue: (...args: unknown[]) => getPetsByRescueMock(...args),
  },
}));

vi.mock('@/components/PetCard', () => ({
  PetCard: ({ pet }: { pet: { name: string } }) => <div>{pet.name}</div>,
}));

import { RescueDetailsPage } from './RescueDetailsPage';

const buildRescue = (overrides: Partial<Rescue> = {}): Rescue => ({
  rescueId: 'rescue-1',
  name: 'Happy Tails',
  email: '',
  address: '',
  city: 'London',
  postcode: '',
  country: 'GB',
  status: 'verified',
  isDeleted: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  verified: true,
  location: { address: '', city: 'London', postcode: '', country: 'GB' },
  type: 'organization',
  ...overrides,
});

const emptyPets: PaginatedResponse<Pet> = {
  data: [],
  pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
};

const mailtoLinks = (): HTMLElement[] =>
  screen.queryAllByRole('link').filter(link => link.getAttribute('href')?.startsWith('mailto:'));

beforeEach(() => {
  vi.clearAllMocks();
  getPetsByRescueMock.mockResolvedValue(emptyPets);
});

describe('RescueDetailsPage – masked contact fields (anonymous viewer)', () => {
  it('renders no mailto link and no blank Email row when contact fields are masked', async () => {
    getRescueMock.mockResolvedValue(buildRescue());

    renderWithProviders(<RescueDetailsPage />);

    await screen.findByRole('heading', { level: 1, name: /happy tails/i });

    expect(screen.queryByRole('button', { name: /contact rescue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contact happy tails/i })).not.toBeInTheDocument();
    expect(mailtoLinks()).toHaveLength(0);
    expect(screen.queryByText('Email')).not.toBeInTheDocument();
  });

  it('still renders the rescue type from the unmasked type field', async () => {
    getRescueMock.mockResolvedValue(buildRescue());

    renderWithProviders(<RescueDetailsPage />);

    await screen.findByRole('heading', { level: 1, name: /happy tails/i });

    expect(screen.getByText('Organization')).toBeInTheDocument();
  });
});

describe('RescueDetailsPage – contact fields present (authenticated viewer)', () => {
  it('renders the Contact button as a mailto link and shows the Email row', async () => {
    getRescueMock.mockResolvedValue(buildRescue({ email: 'hello@happytails.org' }));

    renderWithProviders(<RescueDetailsPage />);

    const contactLink = await screen.findByRole('link', { name: /contact rescue/i });
    expect(contactLink).toHaveAttribute('href', 'mailto:hello@happytails.org');
    expect(screen.getByText('hello@happytails.org')).toBeInTheDocument();
  });

  it('prefers contactEmail over email for the mailto link', async () => {
    getRescueMock.mockResolvedValue(
      buildRescue({ email: 'hello@happytails.org', contactEmail: 'team@happytails.org' })
    );

    renderWithProviders(<RescueDetailsPage />);

    const contactLink = await screen.findByRole('link', { name: /contact rescue/i });
    expect(contactLink).toHaveAttribute('href', 'mailto:team@happytails.org');
  });
});

describe('RescueDetailsPage – pet pagination', () => {
  const pageOf = (petId: string, page: number, hasNext: boolean): PaginatedResponse<Pet> => ({
    data: [{ pet_id: petId, name: `Pet ${petId}`, type: 'dog', status: 'available' } as Pet],
    pagination: { page, limit: 1, total: 2, totalPages: 2, hasNext, hasPrev: page > 1 },
  });

  it('appends the next page of pets when Load More Pets is pressed', async () => {
    getRescueMock.mockResolvedValue(buildRescue());
    getPetsByRescueMock.mockImplementation((_id: string, page: number) =>
      Promise.resolve(page === 1 ? pageOf('a', 1, true) : pageOf('b', 2, false))
    );

    renderWithProviders(<RescueDetailsPage />);

    expect(await screen.findByText('Showing 1 of 2 pets')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /load more pets/i }));

    expect(await screen.findByText('Showing 2 of 2 pets')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more pets/i })).not.toBeInTheDocument();
  });
});
