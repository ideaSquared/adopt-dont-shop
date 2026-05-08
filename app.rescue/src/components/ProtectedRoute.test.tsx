import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock the css module so vanilla-extract style imports don't blow up.
vi.mock('./ProtectedRoute.css', () => ({
  loadingContainer: 'loading-container',
  loadingCard: 'loading-card',
  loadingSpinner: 'loading-spinner',
}));

// Mock lib.components — keep it minimal: just render children/text.
vi.mock('@adopt-dont-shop/lib.components', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// We use vi.hoisted so the mock factory can read this state without TDZ issues.
const authState = vi.hoisted(() => ({
  current: {
    isAuthenticated: false,
    isLoading: false,
    user: null as { userId: string } | null,
  },
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => authState.current,
}));

import { ProtectedRoute } from './ProtectedRoute';

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login instead of rendering protected content', () => {
    authState.current = { isAuthenticated: false, isLoading: false, user: null };

    render(
      <MemoryRouter initialEntries={['/pets']}>
        <Routes>
          <Route
            path="/pets"
            element={
              <ProtectedRoute>
                <div>Protected Pet Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page Stand-In</div>} />
        </Routes>
      </MemoryRouter>
    );

    // The protected content must NOT be rendered in-place.
    expect(screen.queryByText('Protected Pet Content')).not.toBeInTheDocument();
    // The router should have navigated to /login.
    expect(screen.getByText('Login Page Stand-In')).toBeInTheDocument();
  });

  it('renders protected content when the user is authenticated', () => {
    authState.current = {
      isAuthenticated: true,
      isLoading: false,
      user: { userId: 'user-1' },
    };

    render(
      <MemoryRouter initialEntries={['/pets']}>
        <Routes>
          <Route
            path="/pets"
            element={
              <ProtectedRoute>
                <div>Protected Pet Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page Stand-In</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Pet Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page Stand-In')).not.toBeInTheDocument();
  });

  it('shows a loading state while authentication is being checked', () => {
    authState.current = { isAuthenticated: false, isLoading: true, user: null };

    render(
      <MemoryRouter initialEntries={['/pets']}>
        <Routes>
          <Route
            path="/pets"
            element={
              <ProtectedRoute>
                <div>Protected Pet Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page Stand-In</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Pet Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page Stand-In')).not.toBeInTheDocument();
  });
});
