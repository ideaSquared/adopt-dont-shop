/**
 * UX P2 H: when the underlying pets query errors, the DataTable now renders
 * the inline error row (introduced by UX #5) in addition to whatever top-of-page
 * error treatment already existed. This pins down the wiring so future
 * refactors don't silently drop the inline affordance.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';

vi.mock('../hooks', () => ({
  usePets: () => ({
    data: undefined,
    isLoading: false,
    error: new Error('Failed to fetch pets from server'),
  }),
  useBulkUpdatePets: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRescuesList: () => ({ data: { data: [] } }),
}));

vi.mock('../components/modals', () => ({
  BulkConfirmationModal: () => null,
  PetDetailModal: () => null,
}));

import Pets from './Pets';

describe('Pets page error wiring (UX P2 H)', () => {
  it('renders the inline DataTable error row when the pets query fails', () => {
    renderWithProviders(<Pets />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/failed to fetch pets/i);
  });
});
