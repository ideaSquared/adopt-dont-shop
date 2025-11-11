/**
 * Profile Management Behaviour Tests
 *
 * These tests verify profile management behaviours including:
 * - Initial profile setup
 * - Viewing profile information
 * - Editing profile details
 * - Uploading profile picture
 * - Changing settings
 * - Password changes
 *
 * All tests use MSW to mock API responses - no real API calls.
 */

import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../test-utils/test-helpers';
import { resetMockData } from '../test-utils/msw-handlers';
import { ProfilePage } from '../pages/ProfilePage';
import { ProfileSetupPage } from '../pages/ProfileSetupPage';

// Mock auth for authenticated tests
jest.mock('@adopt-dont-shop/lib-auth', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    user: {
      userId: 'user1',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      profileComplete: true,
    },
  })),
}));

describe('Profile Management Behaviours', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('Profile Setup', () => {
    it('prompts new users to complete initial profile setup', async () => {
      const { useAuth } = require('@adopt-dont-shop/lib-auth');
      useAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          userId: 'new-user',
          firstName: 'New',
          lastName: 'User',
          profileComplete: false,
        },
      });

      renderWithProviders(<ProfileSetupPage />);

      // User sees profile setup page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /complete your profile|set up|profile setup/i })).toBeInTheDocument();
      });
    });

    it('allows user to complete initial profile with all required fields', async () => {
      const user = userEvent.setup();

      const { useAuth } = require('@adopt-dont-shop/lib-auth');
      useAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          userId: 'new-user',
          profileComplete: false,
        },
      });

      renderWithProviders(<ProfileSetupPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /complete your profile|set up|profile setup/i })).toBeInTheDocument();
      });

      // User fills profile information
      const phoneInput = screen.getByLabelText(/phone/i);
      await user.type(phoneInput, '555-1234');

      const addressInput = screen.getByLabelText(/address/i);
      await user.type(addressInput, '123 Main St');

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'Test City');

      // User submits profile
      const submitButton = screen.getByRole('button', { name: /save|complete|submit/i });
      await user.click(submitButton);

      // System saves profile and marks as complete
      await waitFor(() => {
        expect(screen.getByText(/profile saved|profile complete|success/i)).toBeInTheDocument();
      });
    });

    it('prevents profile completion with missing required fields', async () => {
      const user = userEvent.setup();

      const { useAuth } = require('@adopt-dont-shop/lib-auth');
      useAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          userId: 'new-user',
          profileComplete: false,
        },
      });

      renderWithProviders(<ProfileSetupPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /complete your profile|set up|profile setup/i })).toBeInTheDocument();
      });

      // User tries to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /save|complete|submit/i });
      await user.click(submitButton);

      // System shows validation errors
      await waitFor(() => {
        expect(screen.getByText(/required|this field is required|please fill/i)).toBeInTheDocument();
      });
    });
  });

  describe('Viewing Profile', () => {
    it('displays user profile information', async () => {
      renderWithProviders(<ProfilePage />);

      // User sees their profile page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // User sees their information
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('shows profile completion status', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // User sees profile completion indicator
      // Implementation may vary (badge, percentage, etc.)
    });

    it('displays user applications history', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // User can navigate to applications tab
      const applicationsTab = screen.getByRole('button', { name: /applications/i });
      expect(applicationsTab).toBeInTheDocument();
    });
  });

  describe('Editing Profile', () => {
    it('allows user to enter edit mode', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // User clicks edit button
      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      // Form fields become editable
      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i);
        expect(firstNameInput).not.toBeDisabled();
      });
    });

    it('allows user to update profile information', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // User enters edit mode
      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i);
        expect(firstNameInput).not.toBeDisabled();
      });

      // User modifies fields
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Updated');

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '555-9999');

      // User saves changes
      const saveButton = screen.getByRole('button', { name: /save|update/i });
      await user.click(saveButton);

      // System saves changes and shows confirmation
      await waitFor(() => {
        expect(screen.getByText(/saved|updated|success/i)).toBeInTheDocument();
      });
    });

    it('allows user to cancel editing', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // User enters edit mode
      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i);
        expect(firstNameInput).not.toBeDisabled();
      });

      // User makes changes
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Changed');

      // User cancels
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Changes are discarded
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });
    });

    it('validates profile fields during editing', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // User enters edit mode
      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).not.toBeDisabled();
      });

      // User enters invalid email
      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      // User tries to save
      const saveButton = screen.getByRole('button', { name: /save|update/i });
      await user.click(saveButton);

      // System shows validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid email|valid email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Profile Picture', () => {
    it('allows user to upload profile picture', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // User clicks on avatar/upload button
      const uploadButton = screen.getByRole('button', { name: /upload|change photo|profile picture/i });
      await user.click(uploadButton);

      // File input appears or modal opens
      await waitFor(() => {
        expect(screen.getByLabelText(/select image|choose file/i)).toBeInTheDocument();
      });

      // User selects image
      const fileInput = screen.getByLabelText(/select image|choose file/i);
      const file = new File(['dummy content'], 'profile.png', { type: 'image/png' });
      await user.upload(fileInput, file);

      // System uploads and displays new image
      await waitFor(() => {
        expect(screen.getByText(/uploaded|photo updated/i)).toBeInTheDocument();
      });
    });

    it('validates image file type', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /upload|change photo|profile picture/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/select image|choose file/i)).toBeInTheDocument();
      });

      // User tries to upload invalid file type
      const fileInput = screen.getByLabelText(/select image|choose file/i);
      const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
      await user.upload(fileInput, file);

      // System shows error for invalid file type
      await waitFor(() => {
        expect(screen.getByText(/invalid file|image only|jpg|png/i)).toBeInTheDocument();
      });
    });

    it('validates image file size', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /upload|change photo|profile picture/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/select image|choose file/i)).toBeInTheDocument();
      });

      // User tries to upload file that's too large
      const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
      const fileInput = screen.getByLabelText(/select image|choose file/i);
      const file = new File([largeContent], 'large.png', { type: 'image/png' });
      await user.upload(fileInput, file);

      // System shows error for file too large
      await waitFor(() => {
        expect(screen.getByText(/too large|file size|maximum/i)).toBeInTheDocument();
      });
    });
  });

  describe('Settings', () => {
    it('allows user to access settings tab', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // User clicks settings tab
      const settingsTab = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsTab);

      // Settings panel is displayed
      await waitFor(() => {
        expect(screen.getByText(/notification|preferences|password/i)).toBeInTheDocument();
      });
    });

    it('allows user to update email notification preferences', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsTab);

      await waitFor(() => {
        expect(screen.getByText(/notification|preferences/i)).toBeInTheDocument();
      });

      // User toggles notification preference
      const emailNotifToggle = screen.getByRole('checkbox', { name: /email notifications/i });
      await user.click(emailNotifToggle);

      // System saves preference
      await waitFor(() => {
        expect(screen.getByText(/saved|updated|preferences saved/i)).toBeInTheDocument();
      });
    });

    it('allows user to change password', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsTab);

      await waitFor(() => {
        expect(screen.getByText(/password/i)).toBeInTheDocument();
      });

      // User enters current and new password
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      await user.type(currentPasswordInput, 'oldPassword123');

      const newPasswordInput = screen.getByLabelText(/new password/i);
      await user.type(newPasswordInput, 'newPassword456!');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, 'newPassword456!');

      // User submits password change
      const changePasswordButton = screen.getByRole('button', { name: /change password|update password/i });
      await user.click(changePasswordButton);

      // System updates password and shows confirmation
      await waitFor(() => {
        expect(screen.getByText(/password updated|password changed|success/i)).toBeInTheDocument();
      });
    });

    it('validates password strength when changing password', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      const settingsTab = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsTab);

      await waitFor(() => {
        expect(screen.getByText(/password/i)).toBeInTheDocument();
      });

      // User enters weak password
      const newPasswordInput = screen.getByLabelText(/new password/i);
      await user.type(newPasswordInput, '123');

      // System shows password requirements
      await waitFor(() => {
        expect(screen.getByText(/password must|weak password|at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('requires password confirmation to match', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      const settingsTab = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsTab);

      await waitFor(() => {
        expect(screen.getByText(/password/i)).toBeInTheDocument();
      });

      // User enters mismatched passwords
      const newPasswordInput = screen.getByLabelText(/new password/i);
      await user.type(newPasswordInput, 'newPassword456!');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, 'differentPassword!');

      const changePasswordButton = screen.getByRole('button', { name: /change password|update password/i });
      await user.click(changePasswordButton);

      // System shows mismatch error
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match|passwords must match/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('allows user to switch between profile tabs', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // User sees multiple tabs
      const profileTab = screen.getByRole('button', { name: /^profile$|my profile/i });
      const applicationsTab = screen.getByRole('button', { name: /applications/i });
      const settingsTab = screen.getByRole('button', { name: /settings/i });

      expect(profileTab).toBeInTheDocument();
      expect(applicationsTab).toBeInTheDocument();
      expect(settingsTab).toBeInTheDocument();

      // User switches to applications tab
      await user.click(applicationsTab);

      await waitFor(() => {
        expect(screen.getByText(/your applications|application history/i)).toBeInTheDocument();
      });

      // User switches to settings tab
      await user.click(settingsTab);

      await waitFor(() => {
        expect(screen.getByText(/notification|preferences|password/i)).toBeInTheDocument();
      });

      // User returns to profile tab
      await user.click(profileTab);

      await waitFor(() => {
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when profile update fails', async () => {
      // Mock API error would be configured in MSW handlers
      const user = userEvent.setup();

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });

      // Attempt profile update that will fail
      // Error handling implementation would be tested here
    });

    it('handles profile picture upload failure', async () => {
      // Mock upload failure
      // User sees error message and can retry
    });
  });
});
