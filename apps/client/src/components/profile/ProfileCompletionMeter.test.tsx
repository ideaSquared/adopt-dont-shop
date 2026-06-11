import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { ProfileCompletionMeter } from './ProfileCompletionMeter';
import {
  PROFILE_METER_CELEBRATED_STORAGE_KEY,
  PROFILE_METER_DISMISSED_STORAGE_KEY,
} from '@/utils/profileCompletion';
import { createMockUser } from '@adopt-dont-shop/lib.dev-tools';

const mockLogEvent = vi.fn();

vi.mock('@/hooks/useStatsig', () => ({
  useStatsig: () => ({ logEvent: mockLogEvent }),
}));

const useAuthMock = vi.fn();
vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => useAuthMock(),
}));

const incompleteUser = createMockUser({
  userId: 'u-1',
  email: 'jane@example.org',
  firstName: 'Jane',
  lastName: 'Doe',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

const completeUser = {
  ...incompleteUser,
  city: 'London',
  country: 'GB',
  bio: 'love dogs',
  profileImageUrl: 'https://cdn/profile.jpg',
  preferences: { petTypes: ['dog'], maxDistance: 25 },
};

describe('ProfileCompletionMeter (ADS-629)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('returns null when the user is not authenticated', () => {
    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false });
    const { container } = renderWithProviders(<ProfileCompletionMeter />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the meter and a row of segments for an authenticated user under 100%', () => {
    useAuthMock.mockReturnValue({ user: incompleteUser, isAuthenticated: true });
    renderWithProviders(<ProfileCompletionMeter />);
    expect(screen.getByRole('region', { name: 'Profile completion' })).toBeInTheDocument();
    expect(screen.getByText(/Profile 25% complete/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('logs profile_meter_clicked with the target section when a segment is clicked', () => {
    useAuthMock.mockReturnValue({ user: incompleteUser, isAuthenticated: true });
    renderWithProviders(<ProfileCompletionMeter />);
    const locationSegment = screen.getByText('Location').closest('a');
    if (!locationSegment) {
      throw new Error('Expected Location segment to be a link');
    }
    fireEvent.click(locationSegment);
    expect(mockLogEvent).toHaveBeenCalledWith('profile_meter_clicked', 1, { target: 'location' });
  });

  it('persists the dismiss action in sessionStorage and hides the meter', () => {
    useAuthMock.mockReturnValue({ user: incompleteUser, isAuthenticated: true });
    const { container } = renderWithProviders(<ProfileCompletionMeter />);
    fireEvent.click(screen.getByRole('button', { name: /Dismiss meter until next session/ }));
    expect(window.sessionStorage.getItem(PROFILE_METER_DISMISSED_STORAGE_KEY)).toBe('true');
    expect(container.firstChild).toBeNull();
  });

  it('respects the dismiss flag from a previous render in the same session', () => {
    window.sessionStorage.setItem(PROFILE_METER_DISMISSED_STORAGE_KEY, 'true');
    useAuthMock.mockReturnValue({ user: incompleteUser, isAuthenticated: true });
    const { container } = renderWithProviders(<ProfileCompletionMeter />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the one-time celebration when completion reaches 100%', () => {
    useAuthMock.mockReturnValue({ user: completeUser, isAuthenticated: true });
    renderWithProviders(<ProfileCompletionMeter />);
    expect(screen.getByText('Profile complete!')).toBeInTheDocument();
  });

  it('hides the celebration permanently after the user dismisses it', () => {
    useAuthMock.mockReturnValue({ user: completeUser, isAuthenticated: true });
    const { container } = renderWithProviders(<ProfileCompletionMeter />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(window.localStorage.getItem(PROFILE_METER_CELEBRATED_STORAGE_KEY)).toBe('true');
    expect(container.firstChild).toBeNull();
  });

  it('does not show the celebration again when the celebrated flag is already set', () => {
    window.localStorage.setItem(PROFILE_METER_CELEBRATED_STORAGE_KEY, 'true');
    useAuthMock.mockReturnValue({ user: completeUser, isAuthenticated: true });
    const { container } = renderWithProviders(<ProfileCompletionMeter />);
    expect(container.firstChild).toBeNull();
  });
});
