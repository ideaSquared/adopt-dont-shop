import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RescueSettings from './RescueSettings';

// Mock all heavy dependencies to focus on tab/hash behaviour
vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { userId: '1', rescueId: 'r1' } }),
  useHasPermission: () => true,
  TwoFactorSettings: () => null,
}));

vi.mock('@adopt-dont-shop/lib.components', async () => {
  const React = await import('react');
  return {
    ThemeToggle: () => null,
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
  default: () => <div data-testid="profile-form">Profile Form</div>,
}));

vi.mock('../components/rescue/AdoptionPolicyForm', () => ({
  default: () => <div data-testid="policy-form">Policy Form</div>,
}));

vi.mock('../components/rescue/NotificationPreferencesForm', () => ({
  default: () => <div data-testid="notif-form">Notification Form</div>,
}));

vi.mock('../components/rescue/QuestionsBuilder', () => ({
  default: () => <div data-testid="questions-builder">Questions</div>,
}));

const renderWithRoute = (initialRoute: string) =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <RescueSettings />
    </MemoryRouter>
  );

const waitForTabsToLoad = () =>
  waitFor(() => {
    expect(screen.getByRole('button', { name: /rescue profile/i })).toBeInTheDocument();
  });

describe('RescueSettings tab persistence via URL hash', () => {
  it('defaults to profile tab when no hash is present', async () => {
    renderWithRoute('/settings');
    await waitForTabsToLoad();
    const profileButton = screen.getByRole('button', { name: /rescue profile/i });
    expect(profileButton.className).toContain('tabActive');
  });

  it('restores the security tab from #security hash', async () => {
    renderWithRoute('/settings#security');
    await waitForTabsToLoad();
    const securityButton = screen.getByRole('button', { name: /^security$/i });
    expect(securityButton.className).toContain('tabActive');
  });

  it('restores the appearance tab from #appearance hash', async () => {
    renderWithRoute('/settings#appearance');
    await waitForTabsToLoad();
    const appearanceButton = screen.getByRole('button', { name: /appearance/i });
    expect(appearanceButton.className).toContain('tabActive');
  });

  it('falls back to profile for invalid hash values', async () => {
    renderWithRoute('/settings#nonexistent');
    await waitForTabsToLoad();
    const profileButton = screen.getByRole('button', { name: /rescue profile/i });
    expect(profileButton.className).toContain('tabActive');
  });

  it('switches tab when a tab button is clicked', async () => {
    renderWithRoute('/settings');
    await waitForTabsToLoad();
    fireEvent.click(screen.getByRole('button', { name: /adoption policies/i }));
    // Navigate triggers re-render; wait for tabs to re-appear
    await waitForTabsToLoad();
    const policiesButton = screen.getByRole('button', { name: /adoption policies/i });
    expect(policiesButton.className).toContain('tabActive');
  });
});
