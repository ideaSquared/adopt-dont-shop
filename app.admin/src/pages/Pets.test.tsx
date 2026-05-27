/**
 * UX P2 H: when the underlying pets query errors, the DataTable now renders
 * the inline error row (introduced by UX #5) in addition to whatever top-of-page
 * error treatment already existed. This pins down the wiring so future
 * refactors don't silently drop the inline affordance.
 *
 * Deep-link behaviour (feat/admin-pets-deep-link):
 * - Visiting /pets/:petId with that pet in the list opens the detail modal.
 * - Clicking a row updates the URL to /pets/:petId.
 * - Closing the modal navigates back to /pets, preserving filter query params.
 * - An unknown petId redirects to /pets without crashing and surfaces a toast.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, toast } from '@adopt-dont-shop/lib.components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithProviders } from '../test-utils';
import type { AdminPet } from '../services/petService';

// Mutable state used by the mocked `usePets` hook below.
let mockPetsResponse: { data: AdminPet[]; pagination?: { pages: number } } | undefined;
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock('../hooks', () => ({
  usePets: () => ({
    data: mockPetsResponse,
    isLoading: mockIsLoading,
    error: mockError,
  }),
  useBulkUpdatePets: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRescuesList: () => ({ data: { data: [] } }),
}));

vi.mock('../components/modals', () => ({
  BulkConfirmationModal: () => null,
  PetDetailModal: ({
    isOpen,
    pet,
    onClose,
  }: {
    isOpen: boolean;
    pet: AdminPet | null;
    onClose: () => void;
  }) =>
    isOpen && pet ? (
      <div data-testid='pet-detail-modal'>
        <span>Detail for: {pet.petId}</span>
        <span>Name: {pet.name}</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

import Pets from './Pets';

const buildPet = (overrides: Partial<AdminPet> = {}): AdminPet => ({
  petId: 'pet-1',
  name: 'Buddy',
  type: 'dog',
  breed: 'Labrador',
  status: 'available',
  archived: false,
  featured: false,
  rescueId: 'rescue-1',
  rescueName: 'Happy Tails',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

const setPetsState = (pets: AdminPet[]): void => {
  mockPetsResponse = { data: pets, pagination: { pages: 1 } };
  mockIsLoading = false;
  mockError = null;
};

const LocationProbe: React.FC = () => {
  const location = useLocation();
  return (
    <div data-testid='location'>
      {location.pathname}
      {location.search}
    </div>
  );
};

const renderPetsRoute = (initialRoute: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ThemeProvider>
          <Routes>
            <Route path='/pets' element={<Pets />} />
            <Route path='/pets/:petId' element={<Pets />} />
          </Routes>
          <LocationProbe />
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  mockPetsResponse = undefined;
  mockIsLoading = false;
  mockError = null;
  vi.mocked(toast.error).mockClear();
});

describe('Pets page error wiring (UX P2 H)', () => {
  it('renders the inline DataTable error row when the pets query fails', () => {
    mockPetsResponse = undefined;
    mockIsLoading = false;
    mockError = new Error('Failed to fetch pets from server');

    renderWithProviders(<Pets />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/failed to fetch pets/i);
  });
});

describe('Pets page deep-linking', () => {
  it('opens the detail modal when /pets/:petId matches a pet in the list', async () => {
    const buddy = buildPet({ petId: 'pet-1', name: 'Buddy' });
    const luna = buildPet({ petId: 'pet-2', name: 'Luna' });
    setPetsState([buddy, luna]);

    renderPetsRoute('/pets/pet-2');

    const modal = await screen.findByTestId('pet-detail-modal');
    expect(modal).toHaveTextContent('Detail for: pet-2');
    expect(modal).toHaveTextContent('Name: Luna');
  });

  it('navigates to /pets/:petId when a row is clicked', async () => {
    const buddy = buildPet({ petId: 'pet-1', name: 'Buddy' });
    setPetsState([buddy]);

    renderPetsRoute('/pets');

    expect(screen.queryByTestId('pet-detail-modal')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Buddy'));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/pets/pet-1');
    });
    expect(await screen.findByTestId('pet-detail-modal')).toHaveTextContent('Detail for: pet-1');
  });

  it('navigates back to /pets when the modal is closed, preserving filter params', async () => {
    const buddy = buildPet({ petId: 'pet-1', name: 'Buddy' });
    setPetsState([buddy]);

    renderPetsRoute('/pets/pet-1?status=available');

    const closeButton = await screen.findByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    await waitFor(() => {
      const probe = screen.getByTestId('location');
      expect(probe).toHaveTextContent('/pets');
      expect(probe).toHaveTextContent('status=available');
    });
    expect(screen.queryByTestId('pet-detail-modal')).not.toBeInTheDocument();
  });

  it('redirects to /pets when the petId is unknown and surfaces a toast', async () => {
    const buddy = buildPet({ petId: 'pet-1', name: 'Buddy' });
    setPetsState([buddy]);

    renderPetsRoute('/pets/does-not-exist');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/pets');
    });
    expect(toast.error).toHaveBeenCalledWith('Pet not found');
    expect(screen.queryByTestId('pet-detail-modal')).not.toBeInTheDocument();
  });
});
