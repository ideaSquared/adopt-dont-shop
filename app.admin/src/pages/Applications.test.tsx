/**
 * UX P2 H: when the underlying applications query errors, the DataTable now
 * renders the inline error row (introduced by UX #5) in addition to whatever
 * top-of-page error treatment already existed. This pins down the wiring so
 * future refactors don't silently drop the inline affordance.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';

vi.mock('../hooks', () => ({
  useApplications: () => ({
    data: undefined,
    isLoading: false,
    error: new Error('Failed to fetch applications from server'),
  }),
  useBulkUpdateApplications: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRescuesList: () => ({ data: { data: [] } }),
}));

vi.mock('../components/modals', () => ({
  BulkConfirmationModal: () => null,
  ApplicationDetailModal: () => null,
}));

import Applications from './Applications';

describe('Applications page error wiring (UX P2 H)', () => {
  it('renders the inline DataTable error row when the applications query fails', () => {
    renderWithProviders(<Applications />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/failed to fetch applications/i);
  });
});
