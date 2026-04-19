/**
 * Behavioral tests for ProtectedRoute component (Admin App)
 *
 * Tests access-control behavior:
 * - Shows a loading state while authentication status is being verified
 * - Redirects unauthenticated visitors to the login page
 * - Shows "Access Denied" for authenticated non-admin users (adopters, rescue staff)
 * - Renders protected content for admin users
 * - Renders protected content for moderator users
 * - Shows "Insufficient Permissions" when a specific role is required and not met
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import { ProtectedRoute } from '../components/ProtectedRoute';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn();

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeUser = (userType: string) => ({
  userId: 'test-user',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  userType,
  status: 'active',
  emailVerified: true,
  phoneNumber: null,
  phoneVerified: false,
  profileImageUrl: null,
  bio: null,
  country: null,
  city: null,
  addressLine1: null,
  addressLine2: null,
  postalCode: null,
  rescueId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  token: 'test-token',
});

const ProtectedContent = () => <div>Protected Admin Content</div>;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  describe('while authentication is loading', () => {
    it('shows a verifying message instead of the protected content', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true, user: null });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Verifying admin access...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    it('redirects to the login page', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('does not show the protected content', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('when an adopter tries to access admin area', () => {
    it('shows an Access Denied message', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('adopter'),
      });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('explains that the admin panel is restricted', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('adopter'),
      });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(
        screen.getByText(/restricted to platform administrators/i)
      ).toBeInTheDocument();
    });

    it('does not show the protected content', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('adopter'),
      });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('when rescue staff tries to access admin area', () => {
    it('shows an Access Denied message', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('rescue_staff'),
      });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('when an admin user accesses the admin area', () => {
    it('renders the protected content', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('admin'),
      });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    });

    it('does not show any access denied message', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('admin'),
      });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });
  });

  describe('when a moderator user accesses the admin area', () => {
    it('renders the protected content', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('moderator'),
      });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    });
  });

  describe('when a specific role is required', () => {
    it('shows Insufficient Permissions when admin tries to access moderator-only area', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('admin'),
      });

      renderWithProviders(
        <ProtectedRoute requiredRole='moderator'>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('explains the required role for access', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('admin'),
      });

      renderWithProviders(
        <ProtectedRoute requiredRole='moderator'>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText(/requires moderator privileges/i)).toBeInTheDocument();
    });

    it('renders content when the user has exactly the required role', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: makeUser('moderator'),
      });

      renderWithProviders(
        <ProtectedRoute requiredRole='moderator'>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    });
  });
});
