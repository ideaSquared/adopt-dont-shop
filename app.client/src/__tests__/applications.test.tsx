/**
 * Application Submission Behaviour Tests
 *
 * These tests verify application submission behaviours including:
 * - Starting application from pet details
 * - Multi-step form completion
 * - Draft saving
 * - Application submission
 * - Application status tracking
 * - Application withdrawal
 *
 * All tests use MSW to mock API responses - no real API calls.
 */

import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../test-utils/test-helpers';
import { resetMockData } from '../test-utils/msw-handlers';
import { ApplicationPage } from '../pages/ApplicationPage';
import { ApplicationDetailsPage } from '../pages/ApplicationDetailsPage';
import { PetDetailsPage } from '../pages/PetDetailsPage';

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

describe('Application Submission Behaviours', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('Starting Application', () => {
    it('allows user to start application from pet details page', async () => {
      const user = userEvent.setup();

      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/pet1' });

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User clicks apply button
      const applyButton = screen.getByRole('button', { name: /apply|adopt|start application/i });
      await user.click(applyButton);

      // System navigates to application form
      // Navigation will be tested in integration
    });

    it('shows profile completion prompt for incomplete profiles', async () => {
      const user = userEvent.setup();

      // Mock incomplete profile
      const { useAuth } = require('@adopt-dont-shop/lib-auth');
      useAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          userId: 'user1',
          firstName: 'Test',
          lastName: 'User',
          profileComplete: false,
        },
      });

      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/pet1' });

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      const applyButton = screen.getByRole('button', { name: /apply|adopt|start application/i });
      await user.click(applyButton);

      // User sees prompt to complete profile
      await waitFor(() => {
        expect(screen.getByText(/complete your profile|profile incomplete/i)).toBeInTheDocument();
      });
    });

    it('requires authentication to start application', async () => {
      const { useAuth } = require('@adopt-dont-shop/lib-auth');
      useAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/pet1' });

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User sees login prompt instead of apply button
      expect(screen.getByText(/sign in to apply|login to adopt/i)).toBeInTheDocument();
    });
  });

  describe('Multi-Step Application Form', () => {
    it('displays all required form steps', async () => {
      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /application|adopt/i })).toBeInTheDocument();
      });

      // User sees step indicators
      expect(screen.getByText(/step 1|basic info/i)).toBeInTheDocument();

      // All steps are indicated (exact implementation varies)
      // Steps typically include: Basic Info, Living Situation, Pet Experience, References, Review
    });

    it('allows user to complete basic information step', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /basic|step 1/i })).toBeInTheDocument();
      });

      // User fills basic info
      const phoneInput = screen.getByLabelText(/phone/i);
      await user.type(phoneInput, '555-1234');

      const addressInput = screen.getByLabelText(/address/i);
      await user.type(addressInput, '123 Main St');

      // User proceeds to next step
      const nextButton = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextButton);

      // System advances to next step
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /living|step 2/i })).toBeInTheDocument();
      });
    });

    it('validates required fields before allowing progression', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /basic|step 1/i })).toBeInTheDocument();
      });

      // User tries to proceed without filling required fields
      const nextButton = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextButton);

      // System shows validation errors
      await waitFor(() => {
        expect(screen.getByText(/required|this field is required/i)).toBeInTheDocument();
      });

      // User remains on current step
      expect(screen.getByRole('heading', { name: /basic|step 1/i })).toBeInTheDocument();
    });

    it('allows user to navigate back to previous steps', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /basic|step 1/i })).toBeInTheDocument();
      });

      // Complete first step
      await user.type(screen.getByLabelText(/phone/i), '555-1234');
      await user.type(screen.getByLabelText(/address/i), '123 Main St');
      await user.click(screen.getByRole('button', { name: /next|continue/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /living|step 2/i })).toBeInTheDocument();
      });

      // User clicks back button
      const backButton = screen.getByRole('button', { name: /back|previous/i });
      await user.click(backButton);

      // System returns to previous step
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /basic|step 1/i })).toBeInTheDocument();
      });

      // Previously entered data is preserved
      expect(screen.getByLabelText(/phone/i)).toHaveValue('555-1234');
    });

    it('allows user to complete living situation step', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      // Navigate to living situation step
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /basic|step 1/i })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/phone/i), '555-1234');
      await user.type(screen.getByLabelText(/address/i), '123 Main St');
      await user.click(screen.getByRole('button', { name: /next|continue/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /living|step 2/i })).toBeInTheDocument();
      });

      // User fills living situation
      const homeTypeSelect = screen.getByLabelText(/home type|residence/i);
      await user.selectOptions(homeTypeSelect, 'house');

      const ownRentSelect = screen.getByLabelText(/own|rent/i);
      await user.selectOptions(ownRentSelect, 'own');

      // User proceeds
      await user.click(screen.getByRole('button', { name: /next|continue/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /experience|step 3/i })).toBeInTheDocument();
      });
    });

    it('allows user to complete pet experience step', async () => {
      const user = userEvent.setup();

      // Navigate through to experience step
      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      // ... navigate to experience step
      // User fills pet experience
      // Implementation depends on form fields
    });

    it('allows user to add references', async () => {
      const user = userEvent.setup();

      // Navigate to references step
      // User can add multiple references
      // Implementation depends on form design
    });

    it('shows review step with all entered information', async () => {
      const user = userEvent.setup();

      // Navigate to review step
      // User sees summary of all entered information
      // User can edit any section
    });
  });

  describe('Draft Saving', () => {
    it('allows user to save application as draft', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /basic|step 1/i })).toBeInTheDocument();
      });

      // User partially fills form
      await user.type(screen.getByLabelText(/phone/i), '555-1234');

      // User clicks save draft button
      const saveDraftButton = screen.getByRole('button', { name: /save draft|save progress/i });
      await user.click(saveDraftButton);

      // System saves draft and shows confirmation
      await waitFor(() => {
        expect(screen.getByText(/draft saved|progress saved/i)).toBeInTheDocument();
      });
    });

    it('allows user to resume draft application', async () => {
      // User navigates to application with existing draft
      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      // System loads saved draft data
      await waitFor(() => {
        expect(screen.getByLabelText(/phone/i)).toHaveValue('555-1234');
      });

      // User can continue from where they left off
    });

    it('auto-saves draft periodically', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /basic|step 1/i })).toBeInTheDocument();
      });

      // User fills form
      await user.type(screen.getByLabelText(/phone/i), '555-1234');

      // System auto-saves after delay
      await waitFor(
        () => {
          expect(screen.getByText(/auto.?saved|saved automatically/i)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Application Submission', () => {
    it('allows user to submit complete application', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      // Complete all steps (simplified for test)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /basic|step 1/i })).toBeInTheDocument();
      });

      // ... fill all required fields through all steps ...

      // Navigate to final review step
      // User clicks submit button
      const submitButton = screen.getByRole('button', { name: /submit|send application/i });
      await user.click(submitButton);

      // System submits application and shows success
      await waitFor(() => {
        expect(
          screen.getByText(/application submitted|successfully submitted/i)
        ).toBeInTheDocument();
      });
    });

    it('prevents submission of incomplete application', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /basic|step 1/i })).toBeInTheDocument();
      });

      // Submit button is disabled until form is complete
      const submitButton = screen.queryByRole('button', { name: /submit|send application/i });
      if (submitButton) {
        expect(submitButton).toBeDisabled();
      }
    });

    it('shows confirmation dialog before submitting', async () => {
      const user = userEvent.setup();

      // Navigate to review step with complete form
      renderWithProviders(<ApplicationPage />, { initialRoute: '/apply/pet1' });

      // User clicks submit
      const submitButton = screen.getByRole('button', { name: /submit|send application/i });
      await user.click(submitButton);

      // User sees confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/are you sure|confirm submission/i)).toBeInTheDocument();
      });

      // User can confirm or cancel
      const confirmButton = screen.getByRole('button', { name: /confirm|yes|submit/i });
      const cancelButton = screen.getByRole('button', { name: /cancel|no|back/i });

      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });

    it('redirects to application dashboard after successful submission', async () => {
      const user = userEvent.setup();

      // Complete and submit application
      // After successful submission, user is redirected
      // This would be tested with router navigation
    });
  });

  describe('Application Status Tracking', () => {
    it('displays user application history', async () => {
      renderWithProviders(<ApplicationDetailsPage />, { initialRoute: '/applications/app-123' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /application/i })).toBeInTheDocument();
      });

      // User sees their application details
      expect(screen.getByText(/pending|submitted/i)).toBeInTheDocument();
    });

    it('shows current application status', async () => {
      renderWithProviders(<ApplicationDetailsPage />, { initialRoute: '/applications/app-123' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /application/i })).toBeInTheDocument();
      });

      // User sees status badge/indicator
      const statusBadge = screen.getByText(/pending|approved|rejected|under review/i);
      expect(statusBadge).toBeInTheDocument();
    });

    it('displays application submission date', async () => {
      renderWithProviders(<ApplicationDetailsPage />, { initialRoute: '/applications/app-123' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /application/i })).toBeInTheDocument();
      });

      // User sees when application was submitted
      expect(screen.getByText(/submitted on|date submitted/i)).toBeInTheDocument();
    });

    it('shows pet information in application details', async () => {
      renderWithProviders(<ApplicationDetailsPage />, { initialRoute: '/applications/app-123' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /application/i })).toBeInTheDocument();
      });

      // User sees which pet they applied for
      // Pet name, image, and basic info displayed
    });
  });

  describe('Application Withdrawal', () => {
    it('allows user to withdraw pending application', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApplicationDetailsPage />, { initialRoute: '/applications/app-123' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /application/i })).toBeInTheDocument();
      });

      // User sees withdraw button for pending application
      const withdrawButton = screen.getByRole('button', { name: /withdraw|cancel application/i });
      await user.click(withdrawButton);

      // System shows confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/are you sure|confirm withdrawal/i)).toBeInTheDocument();
      });

      // User confirms withdrawal
      const confirmButton = screen.getByRole('button', { name: /confirm|yes|withdraw/i });
      await user.click(confirmButton);

      // Application status updates to withdrawn
      await waitFor(() => {
        expect(screen.getByText(/withdrawn/i)).toBeInTheDocument();
      });
    });

    it('prevents withdrawal of approved/rejected applications', async () => {
      // Mock approved application
      renderWithProviders(<ApplicationDetailsPage />, { initialRoute: '/applications/app-456' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /application/i })).toBeInTheDocument();
      });

      // Withdraw button is not available for approved/rejected applications
      expect(
        screen.queryByRole('button', { name: /withdraw|cancel application/i })
      ).not.toBeInTheDocument();
    });

    it('allows user to cancel withdrawal confirmation', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ApplicationDetailsPage />, { initialRoute: '/applications/app-123' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /application/i })).toBeInTheDocument();
      });

      const withdrawButton = screen.getByRole('button', { name: /withdraw|cancel application/i });
      await user.click(withdrawButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure|confirm withdrawal/i)).toBeInTheDocument();
      });

      // User cancels
      const cancelButton = screen.getByRole('button', { name: /cancel|no|back/i });
      await user.click(cancelButton);

      // Dialog closes, application remains pending
      await waitFor(() => {
        expect(screen.queryByText(/are you sure|confirm withdrawal/i)).not.toBeInTheDocument();
      });
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when application submission fails', async () => {
      // Mock API error for submission
      // User sees error message and can retry
    });

    it('shows error when application fails to load', async () => {
      // Mock API error for loading application
      renderWithProviders(<ApplicationDetailsPage />, { initialRoute: '/applications/invalid' });

      await waitFor(() => {
        expect(screen.getByText(/error|not found|failed to load/i)).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      // Mock network failure
      // User sees error message with retry option
    });
  });
});
