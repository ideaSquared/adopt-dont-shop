/**
 * Behavioral tests for Notification Preferences feature (Rescue App)
 *
 * Tests rescue staff-facing behavior through the public interface:
 * - Staff can view their notification preferences
 * - Staff can toggle channel preferences (email, push)
 * - Staff sees SMS as unavailable
 * - Staff can toggle category preferences (applications, messages, system, marketing, reminders)
 * - Staff can change delivery frequency (immediate, daily digest, weekly)
 * - Staff can configure quiet hours (start time, end time, timezone)
 * - Staff receives confirmation when preferences are saved
 * - Staff sees an error message when saving fails
 * - Staff sees loading state while preferences are being fetched
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, userEvent } from '../test-utils';
import NotificationPreferencesForm from '../components/rescue/NotificationPreferencesForm';

vi.mock('../services/libraryServices', () => ({
  apiService: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import { apiService } from '../services/libraryServices';

const mockPreferences = {
  email: true,
  push: true,
  sms: false,
  applications: true,
  messages: true,
  system: true,
  marketing: false,
  reminders: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: 'UTC',
  frequency: 'immediate',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiService.get).mockResolvedValue({
    success: true,
    data: mockPreferences,
  });
  vi.mocked(apiService.put).mockResolvedValue({
    success: true,
    message: 'Notification preferences updated successfully',
    data: mockPreferences,
  });
});

describe('Notification Preferences - Behavioral Tests', () => {
  describe('Loading preferences', () => {
    it('shows a loading indicator while fetching preferences', () => {
      vi.mocked(apiService.get).mockImplementation(() => new Promise(() => undefined));
      renderWithProviders(<NotificationPreferencesForm />);

      expect(screen.getByText(/loading notification preferences/i)).toBeInTheDocument();
    });

    it('displays preferences once loaded', async () => {
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByText('Notification Channels')).toBeInTheDocument();
        expect(screen.getByText('Notification Categories')).toBeInTheDocument();
        expect(screen.getByText('Delivery Frequency')).toBeInTheDocument();
        expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
      });
    });

    it('shows default preferences when loading fails', async () => {
      vi.mocked(apiService.get).mockRejectedValue(new Error('Network error'));
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load notification preferences/i)
        ).toBeInTheDocument();
      });

      expect(screen.getByText('Notification Channels')).toBeInTheDocument();
    });
  });

  describe('Notification channel toggles', () => {
    it('shows email toggle as enabled when preference is on', async () => {
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        const emailToggle = screen.getByRole('button', { name: /toggle email notifications/i });
        expect(emailToggle).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('allows staff to disable email notifications', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle email notifications/i })).toBeInTheDocument();
      });

      const emailToggle = screen.getByRole('button', { name: /toggle email notifications/i });
      expect(emailToggle).toHaveAttribute('aria-pressed', 'true');

      await user.click(emailToggle);

      expect(emailToggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('allows staff to enable push notifications', async () => {
      const user = userEvent.setup();
      vi.mocked(apiService.get).mockResolvedValue({
        success: true,
        data: { ...mockPreferences, push: false },
      });
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        const pushToggle = screen.getByRole('button', { name: /toggle push notifications/i });
        expect(pushToggle).toHaveAttribute('aria-pressed', 'false');
      });

      const pushToggle = screen.getByRole('button', { name: /toggle push notifications/i });
      await user.click(pushToggle);

      expect(pushToggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows SMS notifications as unavailable', async () => {
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByText('SMS Notifications')).toBeInTheDocument();
      });

      const smsToggle = screen.getByRole('button', { name: /toggle sms notifications/i });
      expect(smsToggle).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByText(/sms notifications are not currently available/i)).toBeInTheDocument();
    });

    it('does not change SMS preference when staff clicks the disabled toggle', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle sms notifications/i })).toBeInTheDocument();
      });

      const smsToggle = screen.getByRole('button', { name: /toggle sms notifications/i });
      const initialPressed = smsToggle.getAttribute('aria-pressed');
      await user.click(smsToggle);

      expect(smsToggle).toHaveAttribute('aria-pressed', initialPressed);
    });
  });

  describe('Notification category toggles', () => {
    it('shows application notifications as enabled', async () => {
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        const toggle = screen.getByRole('button', { name: /toggle application notifications/i });
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('allows staff to disable marketing notifications', async () => {
      const user = userEvent.setup();
      vi.mocked(apiService.get).mockResolvedValue({
        success: true,
        data: { ...mockPreferences, marketing: true },
      });
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        const toggle = screen.getByRole('button', { name: /toggle marketing notifications/i });
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
      });

      const toggle = screen.getByRole('button', { name: /toggle marketing notifications/i });
      await user.click(toggle);

      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('allows staff to toggle system update notifications', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /toggle system update notifications/i })
        ).toBeInTheDocument();
      });

      const toggle = screen.getByRole('button', { name: /toggle system update notifications/i });
      expect(toggle).toHaveAttribute('aria-pressed', 'true');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('allows staff to toggle message notifications', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /toggle message notifications/i })
        ).toBeInTheDocument();
      });

      const toggle = screen.getByRole('button', { name: /toggle message notifications/i });
      expect(toggle).toHaveAttribute('aria-pressed', 'true');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('allows staff to toggle reminder notifications', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /toggle reminder notifications/i })
        ).toBeInTheDocument();
      });

      const toggle = screen.getByRole('button', { name: /toggle reminder notifications/i });
      expect(toggle).toHaveAttribute('aria-pressed', 'true');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Delivery frequency', () => {
    it('shows immediate as the selected frequency by default', async () => {
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        const immediateButton = screen.getByRole('button', { name: /immediate/i });
        expect(immediateButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('allows staff to switch to daily digest', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /daily digest/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /daily digest/i }));

      expect(screen.getByRole('button', { name: /daily digest/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByRole('button', { name: /immediate/i })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });

    it('allows staff to switch to weekly digest', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /weekly digest/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /weekly digest/i }));

      expect(screen.getByRole('button', { name: /weekly digest/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    it('shows only one frequency option as selected at a time', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /weekly digest/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /weekly digest/i }));

      const frequencies = ['Immediate', 'Daily Digest', 'Weekly Digest'];
      const selectedCount = frequencies.filter(label => {
        const btn = screen.getByRole('button', { name: new RegExp(label, 'i') });
        return btn.getAttribute('aria-pressed') === 'true';
      }).length;

      expect(selectedCount).toBe(1);
    });
  });

  describe('Quiet hours configuration', () => {
    it('displays quiet hours start and end time inputs', async () => {
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/quiet hours start time/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/quiet hours end time/i)).toBeInTheDocument();
      });
    });

    it('shows current quiet hours values loaded from preferences', async () => {
      vi.mocked(apiService.get).mockResolvedValue({
        success: true,
        data: { ...mockPreferences, quietHoursStart: '21:00', quietHoursEnd: '07:00' },
      });
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        const startInput = screen.getByLabelText(/quiet hours start time/i);
        const endInput = screen.getByLabelText(/quiet hours end time/i);
        expect(startInput).toHaveValue('21:00');
        expect(endInput).toHaveValue('07:00');
      });
    });

    it('displays a timezone selector', async () => {
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
      });

      const timezoneSelect = screen.getByLabelText(/timezone/i);
      expect(timezoneSelect).toHaveValue('UTC');
    });

    it('allows staff to change the timezone', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
      });

      await user.selectOptions(
        screen.getByLabelText(/timezone/i),
        'America/New_York'
      );

      expect(screen.getByLabelText(/timezone/i)).toHaveValue('America/New_York');
    });
  });

  describe('Saving preferences', () => {
    it('shows a save button', async () => {
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
      });
    });

    it('displays a success message after preferences are saved', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /save preferences/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(
          'Preferences saved successfully.'
        );
      });
    });

    it('sends updated preferences to the backend when saving', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle email notifications/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /toggle email notifications/i }));
      await user.click(screen.getByRole('button', { name: /save preferences/i }));

      await waitFor(() => {
        expect(vi.mocked(apiService.put)).toHaveBeenCalledWith(
          '/api/v1/notifications/preferences',
          expect.objectContaining({ email: false })
        );
      });
    });

    it('shows an error message when saving fails', async () => {
      const user = userEvent.setup();
      vi.mocked(apiService.put).mockRejectedValue(new Error('Server error'));
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /save preferences/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          /failed to save notification preferences/i
        );
      });
    });

    it('shows Saving... text on the button while the save request is in progress', async () => {
      const user = userEvent.setup();
      let resolveRequest: (value: unknown) => void;
      vi.mocked(apiService.put).mockImplementation(
        () => new Promise(resolve => { resolveRequest = resolve; })
      );
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();

      resolveRequest!({ success: true, data: mockPreferences });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
      });
    });

    it('clears the success message when a preference is changed after saving', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NotificationPreferencesForm />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /save preferences/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /toggle email notifications/i }));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
