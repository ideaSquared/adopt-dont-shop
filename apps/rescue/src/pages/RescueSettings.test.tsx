import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import RescueSettings from './RescueSettings';
import { apiService } from '../services/libraryServices';

// Mock all heavy dependencies to focus on tab/hash behaviour
vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { userId: '1', rescueId: 'r1' } }),
  // ADS-757: hook now returns { allowed, isLoading, error }.
  useHasPermission: () => ({ allowed: true, isLoading: false, error: null }),
}));

vi.mock('@adopt-dont-shop/lib.components', async importOriginal => {
  const React = await import('react');
  // Real Tabs: the page's tab behaviour is part of what these tests cover.
  const { Tabs } = await importOriginal<typeof import('@adopt-dont-shop/lib.components')>();
  return {
    Tabs,
    toast: { success: vi.fn(), error: vi.fn() },
    Skeleton: (props: Record<string, unknown>) =>
      React.createElement('div', { 'aria-hidden': 'true', ...props }),
    SkeletonText: () => React.createElement('div', { 'aria-hidden': 'true' }),
    SkeletonCard: () => React.createElement('div', { 'aria-hidden': 'true' }),
  };
});

vi.mock('../services/libraryServices', () => ({
  apiService: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes('/staff/me')) {
        return Promise.resolve({ data: { rescueId: 'r1' } });
      }
      return Promise.resolve({ data: { rescueId: 'r1', name: 'Test Rescue', settings: {} } });
    }),
    put: vi.fn().mockResolvedValue({}),
  },
  rescueService: { updateAdoptionPolicies: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@adopt-dont-shop/lib.permissions', () => ({
  RESCUE_SETTINGS_UPDATE: 'rescue:settings:update',
}));

vi.mock('../components/rescue/RescueProfileForm', () => ({
  default: ({ rescue }: { rescue: { address: { street: string } } | null }) => (
    <div data-testid="profile-form">{rescue?.address.street}</div>
  ),
}));

vi.mock('../components/rescue/AdoptionPolicyForm', () => ({
  default: () => <div data-testid="policy-form">Policy Form</div>,
}));

vi.mock('../components/rescue/QuestionsBuilder', () => ({
  default: () => <div data-testid="questions-builder">Questions</div>,
}));

const LocationProbe = () => {
  const { pathname, hash } = useLocation();
  return <div data-testid="location">{`${pathname}${hash}`}</div>;
};

const renderWithRoute = (initialRoute: string) =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <RescueSettings />
      <LocationProbe />
    </MemoryRouter>
  );

const waitForTabsToLoad = () =>
  waitFor(() => {
    expect(screen.getByRole('tab', { name: /rescue profile/i })).toBeInTheDocument();
  });

describe('RescueSettings tab persistence via URL hash', () => {
  it('defaults to profile tab when no hash is present', async () => {
    renderWithRoute('/settings');
    await waitForTabsToLoad();
    const profileButton = screen.getByRole('tab', { name: /rescue profile/i });
    expect(profileButton).toHaveAttribute('aria-selected', 'true');
  });

  it.each(['#preferences', '#security', '#appearance'])(
    'redirects the old %s hash to /user-settings',
    async hash => {
      renderWithRoute(`/settings${hash}`);
      expect(await screen.findByTestId('location')).toHaveTextContent(`/user-settings${hash}`);
      expect(screen.queryByRole('tab', { name: /rescue profile/i })).not.toBeInTheDocument();
    }
  );

  it('no longer renders the personal settings tabs', async () => {
    renderWithRoute('/settings');
    await waitForTabsToLoad();
    expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual([
      'Rescue Profile',
      'Adoption Policies',
      'Application Questions',
    ]);
  });

  it('falls back to profile for invalid hash values', async () => {
    renderWithRoute('/settings#nonexistent');
    await waitForTabsToLoad();
    const profileButton = screen.getByRole('tab', { name: /rescue profile/i });
    expect(profileButton).toHaveAttribute('aria-selected', 'true');
  });

  it('switches tab when a tab button is clicked', async () => {
    renderWithRoute('/settings');
    await waitForTabsToLoad();
    fireEvent.click(screen.getByRole('tab', { name: /adoption policies/i }));
    // Navigate triggers re-render; wait for tabs to re-appear
    await waitForTabsToLoad();
    const policiesButton = screen.getByRole('tab', { name: /adoption policies/i });
    expect(policiesButton).toHaveAttribute('aria-selected', 'true');
  });
});

describe('RescueSettings application questions tab', () => {
  it('maps the snake_case gateway rescue for the questions builder and profile form', async () => {
    vi.mocked(apiService.get).mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('/staff/me')
          ? { data: { rescueId: 'r1' } }
          : {
              data: {
                rescue_id: 'r1',
                name: 'Test Rescue',
                address: '1 High Street',
                city: 'York',
                postcode: 'YO1 1AA',
                country: 'United Kingdom',
                status: 'verified',
                settings: {},
              },
            }
      )
    );
    renderWithRoute('/settings#questions');
    expect(await screen.findByTestId('questions-builder')).toBeInTheDocument();
    expect(screen.queryByText(/loading rescue information/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('profile-form')).toHaveTextContent('1 High Street');
  });
});
