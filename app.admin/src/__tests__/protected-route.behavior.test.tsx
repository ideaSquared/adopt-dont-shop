/**
 * Behavioral tests for ProtectedRoute (Admin App).
 *
 * The component combines two checks:
 *   1. Identity — the signed-in user must be an admin-tier UserType
 *      (admin, super_admin, moderator, support_agent). This is "who you are"
 *      and gates access to the admin app shell.
 *   2. Capability — when `requiredPermission` or `anyOf` is set, the user
 *      must hold the named permission(s). This is "what you can do".
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import { ProtectedRoute } from '../components/ProtectedRoute';

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn();
const mockUsePermissions = vi.fn();

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => mockUseAuth(),
  usePermissions: () => mockUsePermissions(),
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

const setup = ({
  userType,
  isAuthenticated = true,
  isAuthLoading = false,
  permissions = [] as string[],
  permissionsLoading = false,
}: {
  userType?: string;
  isAuthenticated?: boolean;
  isAuthLoading?: boolean;
  permissions?: string[];
  permissionsLoading?: boolean;
}) => {
  mockUseAuth.mockReturnValue({
    isAuthenticated,
    isLoading: isAuthLoading,
    user: userType ? makeUser(userType) : null,
  });
  mockUsePermissions.mockReturnValue({
    permissions,
    isLoading: permissionsLoading,
    refresh: vi.fn(),
  });
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUsePermissions.mockReset();
  });

  describe('while loading', () => {
    it('shows a verifying message while auth is loading', () => {
      setup({ isAuthenticated: false, isAuthLoading: true });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Verifying admin access...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('shows a verifying message while permissions are loading', () => {
      setup({ userType: 'admin', permissionsLoading: true });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Verifying admin access...')).toBeInTheDocument();
    });
  });

  describe('when user is not authenticated', () => {
    it('does not render the protected content', () => {
      setup({ isAuthenticated: false });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('identity check (admin-tier user)', () => {
    it('blocks adopters with "Access Denied"', () => {
      setup({ userType: 'adopter' });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('blocks rescue staff with "Access Denied"', () => {
      setup({ userType: 'rescue_staff' });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('allows admins through when no capability gate is set', () => {
      setup({ userType: 'admin' });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    });

    it('allows moderators through when no capability gate is set', () => {
      setup({ userType: 'moderator' });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    });

    it('allows super_admins through when no capability gate is set', () => {
      setup({ userType: 'super_admin' });

      renderWithProviders(
        <ProtectedRoute>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    });
  });

  describe('capability check via requiredPermission', () => {
    it('renders content when the user holds the required permission', () => {
      setup({ userType: 'admin', permissions: ['admin.config.update'] });

      renderWithProviders(
        <ProtectedRoute requiredPermission='admin.config.update'>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
      expect(screen.queryByText('Insufficient Permissions')).not.toBeInTheDocument();
    });

    it('shows "Insufficient Permissions" when the user lacks it', () => {
      setup({ userType: 'moderator', permissions: ['users.read'] });

      renderWithProviders(
        <ProtectedRoute requiredPermission='admin.config.update'>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('capability check via anyOf', () => {
    it('renders content when the user holds at least one of the permissions', () => {
      setup({ userType: 'admin', permissions: ['admin.audit.read'] });

      renderWithProviders(
        <ProtectedRoute anyOf={['admin.audit.read', 'admin.security.read']}>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    });

    it('blocks the user when none of the listed permissions are held', () => {
      setup({ userType: 'moderator', permissions: ['users.read'] });

      renderWithProviders(
        <ProtectedRoute anyOf={['admin.audit.read', 'admin.security.read']}>
          <ProtectedContent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    });
  });
});
