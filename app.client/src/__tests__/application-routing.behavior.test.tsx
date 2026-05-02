import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { AppShell } from '@/components/layout/AppShell';

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

vi.mock('@/contexts/NotificationsContext', () => ({
  useNotifications: () => ({ unreadCount: 0 }),
}));

vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => ({ unreadMessageCount: 0 }),
}));

vi.mock('@/components/ui/SwipeFloatingButton', () => ({
  SwipeFloatingButton: () => null,
}));

vi.mock('@/components/onboarding/SwipeOnboarding', () => ({ SwipeOnboarding: () => null }));

vi.mock('@/pages/ApplicationDashboard', () => ({
  ApplicationDashboard: () => <div>Application dashboard</div>,
}));
vi.mock('@/pages/ApplicationDetailsPage', () => ({
  ApplicationDetailsPage: () => <div>Application details</div>,
}));

import { ApplicationDashboard } from '@/pages/ApplicationDashboard';
import { ApplicationDetailsPage } from '@/pages/ApplicationDetailsPage';

const renderAt = (path: string) =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path='/applications' element={<ApplicationDashboard />} />
            <Route path='/applications/:id' element={<ApplicationDetailsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe('Application routing', () => {
  it('renders ApplicationDashboard at /applications', () => {
    renderAt('/applications');
    expect(screen.getByText('Application dashboard')).toBeInTheDocument();
  });

  it('renders ApplicationDetailsPage at /applications/:id', () => {
    renderAt('/applications/abc-123');
    expect(screen.getByText('Application details')).toBeInTheDocument();
  });
});
