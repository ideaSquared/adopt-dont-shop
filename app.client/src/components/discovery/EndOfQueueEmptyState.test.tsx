import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { EndOfQueueEmptyState } from './EndOfQueueEmptyState';
import notificationService from '@/services/notificationService';

const mockLogEvent = vi.fn();

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({ logEvent: mockLogEvent }),
}));

vi.mock('@/services/notificationService', () => ({
  default: {
    updatePreferences: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockedNotifications = notificationService as unknown as {
  updatePreferences: ReturnType<typeof vi.fn>;
};

describe('EndOfQueueEmptyState (ADS-630)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the headline, Notify Me CTA, and a secondary Browse the full list link', () => {
    renderWithProviders(<EndOfQueueEmptyState />);
    expect(screen.getByText(/You.*seen your top matches/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Notify me when new matches arrive' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse the full list' })).toHaveAttribute(
      'href',
      '/search'
    );
  });

  it('logs discover_queue_exhausted_shown exactly once on mount', () => {
    renderWithProviders(<EndOfQueueEmptyState />);
    expect(mockLogEvent).toHaveBeenCalledWith('discover_queue_exhausted_shown', 1);
  });

  it('opts the user into reminders and swaps to the "We\'ll let you know" confirmation after a successful click', async () => {
    renderWithProviders(<EndOfQueueEmptyState />);

    fireEvent.click(screen.getByRole('button', { name: 'Notify me when new matches arrive' }));

    await waitFor(() => {
      expect(mockedNotifications.updatePreferences).toHaveBeenCalledWith({ reminders: true });
    });
    await waitFor(() => {
      expect(screen.getByText(/We.*ll let you know/)).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: 'Notify me when new matches arrive' })
    ).not.toBeInTheDocument();
    expect(mockLogEvent).toHaveBeenCalledWith('discover_queue_exhausted_notify_opt_in_clicked', 1);
  });

  it('keeps the Notify Me CTA visible and surfaces the error when updatePreferences rejects', async () => {
    mockedNotifications.updatePreferences.mockRejectedValueOnce(new Error('Network down'));

    renderWithProviders(<EndOfQueueEmptyState />);

    fireEvent.click(screen.getByRole('button', { name: 'Notify me when new matches arrive' }));

    await waitFor(() => {
      expect(screen.getByText('Network down')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'Notify me when new matches arrive' })
    ).toBeInTheDocument();
  });

  it('logs discover_queue_exhausted_browse_list_clicked when the secondary link is followed', () => {
    renderWithProviders(<EndOfQueueEmptyState />);

    fireEvent.click(screen.getByRole('link', { name: 'Browse the full list' }));

    expect(mockLogEvent).toHaveBeenCalledWith('discover_queue_exhausted_browse_list_clicked', 1);
  });
});
