/**
 * Admins decide which pets are featured on the client home page. They feature
 * or unfeature the selected pets from the pets list's bulk actions.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminPet } from '../services/petService';

const mutateAsync = vi.fn();

const PET: AdminPet = {
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
};

vi.mock('../hooks', () => ({
  usePets: () => ({
    data: { data: [PET], pagination: { pages: 1, total: 1 } },
    isLoading: false,
    error: null,
  }),
  usePetById: () => ({ isError: false }),
  useBulkUpdatePets: () => ({ mutateAsync, isPending: false }),
  useRescuesList: () => ({ data: { data: [] } }),
}));

vi.mock('../components/modals', () => ({
  BulkConfirmationModal: ({
    isOpen,
    title,
    confirmLabel,
    onConfirm,
  }: {
    isOpen: boolean;
    title: string;
    confirmLabel: string;
    onConfirm: (reason?: string) => Promise<void>;
  }) =>
    isOpen ? (
      <div role='dialog' aria-label={title}>
        <button onClick={() => onConfirm('Homepage promotion')}>{confirmLabel}</button>
      </div>
    ) : null,
}));

vi.mock('../components/detail', () => ({
  PetDetailPanel: () => null,
  EntityDetailLayout: ({ list }: { list: React.ReactNode }) => <>{list}</>,
}));

import Pets from './Pets';

const renderPets = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/pets']}>
        <ThemeProvider>
          <Routes>
            <Route path='/pets' element={<Pets />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('Pets featuring', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ successCount: 1, failedCount: 0 });
  });

  it('features the selected pets', async () => {
    const user = userEvent.setup();
    renderPets();

    await user.click(screen.getByRole('checkbox', { name: 'Select row pet-1' }));
    await user.click(screen.getByRole('button', { name: 'Feature' }));
    await user.click(screen.getByRole('button', { name: 'Feature Pets' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        petIds: ['pet-1'],
        operation: 'feature',
        data: { featured: true },
        reason: 'Homepage promotion',
      })
    );
  });

  it('unfeatures the selected pets', async () => {
    const user = userEvent.setup();
    renderPets();

    await user.click(screen.getByRole('checkbox', { name: 'Select row pet-1' }));
    await user.click(screen.getByRole('button', { name: 'Unfeature' }));
    await user.click(screen.getByRole('button', { name: 'Unfeature Pets' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        petIds: ['pet-1'],
        operation: 'feature',
        data: { featured: false },
        reason: 'Homepage promotion',
      })
    );
  });
});
