import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SanctionBanner, type ActiveSanction } from './SanctionBanner';

const warning: ActiveSanction = {
  id: 'sanction-1',
  type: 'warning_issued',
  reason: 'Please be kind to other adopters',
  severity: 'low',
  expiresAt: null,
  acknowledgedAt: null,
};

const suspension: ActiveSanction = {
  id: 'sanction-2',
  type: 'user_suspended',
  reason: 'Repeated harassment',
  severity: 'high',
  expiresAt: '2099-01-01T00:00:00.000Z',
  acknowledgedAt: null,
};

describe('SanctionBanner', () => {
  it('renders one banner per active sanction', async () => {
    const fetchSanctions = vi.fn().mockResolvedValue([warning, suspension]);
    const acknowledgeSanction = vi.fn().mockResolvedValue(undefined);

    render(
      <SanctionBanner fetchSanctions={fetchSanctions} acknowledgeSanction={acknowledgeSanction} />
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('sanction-banner-item')).toHaveLength(2);
    });
    expect(screen.getByText('A moderator issued you a warning')).toBeInTheDocument();
    expect(screen.getByText('Your account has been suspended')).toBeInTheDocument();
    expect(screen.getByText('Repeated harassment')).toBeInTheDocument();
  });

  it('renders nothing when the server returns no sanctions', async () => {
    const fetchSanctions = vi.fn().mockResolvedValue([]);
    const acknowledgeSanction = vi.fn();

    render(
      <SanctionBanner fetchSanctions={fetchSanctions} acknowledgeSanction={acknowledgeSanction} />
    );

    await waitFor(() => {
      expect(fetchSanctions).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('sanction-banner-item')).not.toBeInTheDocument();
  });

  it('removes a sanction from the UI after the user acknowledges it', async () => {
    const fetchSanctions = vi.fn().mockResolvedValue([warning, suspension]);
    const acknowledgeSanction = vi.fn().mockResolvedValue(undefined);

    render(
      <SanctionBanner fetchSanctions={fetchSanctions} acknowledgeSanction={acknowledgeSanction} />
    );

    const dismiss = await screen.findByTestId('sanction-banner-dismiss-sanction-1');
    await userEvent.click(dismiss);

    await waitFor(() => {
      expect(acknowledgeSanction).toHaveBeenCalledWith('sanction-1');
    });
    await waitFor(() => {
      expect(screen.queryByText('A moderator issued you a warning')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Your account has been suspended')).toBeInTheDocument();
  });

  it('refetches when the refreshKey prop changes', async () => {
    const fetchSanctions = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([warning]);
    const acknowledgeSanction = vi.fn();

    const { rerender } = render(
      <SanctionBanner
        fetchSanctions={fetchSanctions}
        acknowledgeSanction={acknowledgeSanction}
        refreshKey='before'
      />
    );

    await waitFor(() => {
      expect(fetchSanctions).toHaveBeenCalledTimes(1);
    });

    rerender(
      <SanctionBanner
        fetchSanctions={fetchSanctions}
        acknowledgeSanction={acknowledgeSanction}
        refreshKey='after'
      />
    );

    await waitFor(() => {
      expect(fetchSanctions).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('A moderator issued you a warning')).toBeInTheDocument();
  });
});
