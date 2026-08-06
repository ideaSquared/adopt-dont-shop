import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';
import { createMockUser } from '@adopt-dont-shop/lib.dev-tools';
import type { NotificationPreferences } from '@/services/notificationService';
import { SettingsForm } from './SettingsForm';

const getPreferencesMock = vi.fn();
const updatePreferencesMock = vi.fn();

vi.mock('@/services/notificationService', () => ({
  default: {
    getPreferences: () => getPreferencesMock(),
    updatePreferences: (...args: unknown[]) => updatePreferencesMock(...args),
  },
}));

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    TwoFactorSettings: () => <div data-testid='two-factor-settings' />,
  };
});

const defaultPreferences: NotificationPreferences = {
  email: true,
  push: false,
  sms: false,
  applications: true,
  messages: true,
  system: true,
  marketing: false,
  reminders: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

const baseUser = createMockUser({
  userId: 'user-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
});

describe('SettingsForm', () => {
  beforeEach(() => {
    getPreferencesMock.mockReset();
    updatePreferencesMock.mockReset();
    getPreferencesMock.mockResolvedValue(defaultPreferences);
    updatePreferencesMock.mockResolvedValue(undefined);
  });

  it('renders each setting with an accessible label', async () => {
    render(<SettingsForm user={baseUser} onSave={vi.fn()} />);

    // Notification toggles are exposed as labelled checkboxes.
    expect(await screen.findByLabelText(/email notifications/i)).toHaveProperty('type', 'checkbox');
    expect(screen.getByLabelText(/push notifications/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/marketing & promotions/i)).toBeInTheDocument();

    // Privacy + preference dropdowns are labelled comboboxes.
    expect(screen.getByLabelText(/profile visibility/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/search radius/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quiet hours start/i)).toBeInTheDocument();

    // Descriptions remain as accessible help text.
    expect(
      screen.getByText(/receive updates about your applications and new pet matches/i)
    ).toBeInTheDocument();
  });

  it('reflects the notification preferences loaded from the service', async () => {
    getPreferencesMock.mockResolvedValue({
      ...defaultPreferences,
      email: false,
      push: true,
    });

    render(<SettingsForm user={baseUser} onSave={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/email notifications/i)).not.toBeChecked();
    });
    expect(screen.getByLabelText(/push notifications/i)).toBeChecked();
  });

  it('renders each dropdown showing its current value', async () => {
    render(<SettingsForm user={baseUser} onSave={vi.fn()} />);

    await screen.findByLabelText(/profile visibility/i);
    // Defaults: public profile, 25 mile radius.
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('25 miles')).toBeInTheDocument();
  });

  it('reveals the save controls only after a setting changes', async () => {
    const user = userEvent.setup();
    render(<SettingsForm user={baseUser} onSave={vi.fn()} />);

    await screen.findByLabelText(/show email address/i);
    expect(screen.queryByRole('button', { name: /save settings/i })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/show email address/i));

    expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
  });

  it('saves the changed settings through the service and onSave prop', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SettingsForm user={baseUser} onSave={onSave} />);

    await screen.findByLabelText(/show email address/i);

    await user.click(screen.getByLabelText(/show email address/i));
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(updatePreferencesMock).toHaveBeenCalledTimes(1);
    });
    expect(updatePreferencesMock.mock.calls[0][0]).toMatchObject({
      email: true,
      push: false,
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as {
      privacy: { showEmail: boolean };
      preferences: { maxDistance: number };
      notifications: { email: boolean };
    };
    expect(saved.privacy.showEmail).toBe(true);
    expect(saved.preferences.maxDistance).toBe(25);
    expect(saved.notifications.email).toBe(true);
  });
});
