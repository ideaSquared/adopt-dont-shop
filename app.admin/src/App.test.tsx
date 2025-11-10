import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { describe, it, expect, jest } from '@jest/globals';
import { ThemeProvider } from '@adopt-dont-shop/components';
import App from './App';

// Mock the auth hook
jest.mock('@adopt-dont-shop/lib-auth', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    isLoading: false,
    user: { userId: 'test-user', userType: 'admin' },
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock all page components
jest.mock('./pages', () => ({
  LoginPage: () => <div>Login Page</div>,
  RegisterPage: () => <div>Register Page</div>,
  Dashboard: () => <div>Dashboard</div>,
  Users: () => <div>Users Page</div>,
  Rescues: () => <div>Rescues Page</div>,
  Pets: () => <div>Pets Page</div>,
  Applications: () => <div>Applications Page</div>,
  Moderation: () => <div>Moderation Page</div>,
  Support: () => <div>Support Page</div>,
  Analytics: () => <div>Analytics Page</div>,
  Configuration: () => <div>Configuration Page</div>,
  Audit: () => <div>Audit Page</div>,
  Messages: () => <div>Messages Page</div>,
  Reports: () => <div>Reports Page</div>,
}));

// Mock components
jest.mock('./components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./components/layout/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('./components/dev/DevLoginPanel', () => ({
  __esModule: true,
  default: () => null,
}));

const createWrapper = (initialRoute = '/') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('App Routing', () => {
  it('should render Users page with userId parameter', () => {
    render(<App />, { wrapper: createWrapper('/users/user-123') });
    expect(screen.getByText('Users Page')).toBeInTheDocument();
  });

  it('should render Rescues page with rescueId parameter', () => {
    render(<App />, { wrapper: createWrapper('/rescues/rescue-456') });
    expect(screen.getByText('Rescues Page')).toBeInTheDocument();
  });

  it('should render Pets page with petId parameter', () => {
    render(<App />, { wrapper: createWrapper('/pets/pet-789') });
    expect(screen.getByText('Pets Page')).toBeInTheDocument();
  });

  it('should render Applications page with applicationId parameter', () => {
    render(<App />, { wrapper: createWrapper('/applications/app-101') });
    expect(screen.getByText('Applications Page')).toBeInTheDocument();
  });

  it('should render Messages page', () => {
    render(<App />, { wrapper: createWrapper('/messages') });
    expect(screen.getByText('Messages Page')).toBeInTheDocument();
  });

  it('should render Moderation page', () => {
    render(<App />, { wrapper: createWrapper('/moderation') });
    expect(screen.getByText('Moderation Page')).toBeInTheDocument();
  });

  it('should render Dashboard as default route', () => {
    render(<App />, { wrapper: createWrapper('/') });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
