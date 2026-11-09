import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { userId: 'user-1' } }),
}));

vi.mock('../services/notification-preferences-service', async importOriginal => ({
  ...(await importOriginal<typeof import('../services/notification-preferences-service')>()),
  fetchNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}));

import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../services/notification-preferences-service';
import { NotificationPreferencesForm } from './NotificationPreferencesForm';

const SAVED: NotificationPreferences = {
  emailEnabled: true,
  pushEnabled: false,
  smsEnabled: false,
  applicationUpdates: true,
  petMatches: false,
  rescueUpdates: true,
  chatMessages: true,
  digestFrequency: 'daily',
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  timezone: 'Europe/London',
};

const renderForm = (
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
) => {
  return render(
    <QueryClientProvider client={client}>
      <NotificationPreferencesForm />
    </QueryClientProvider>
  );
};

const saveButton = () => screen.getByRole('button', { name: /save notification preferences/i });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchNotificationPreferences).mockResolvedValue(SAVED);
  vi.mocked(updateNotificationPreferences).mockImplementation(async prefs => prefs);
});

describe('NotificationPreferencesForm', () => {
  it('shows a loading message while preferences are fetched', () => {
    vi.mocked(fetchNotificationPreferences).mockReturnValue(new Promise(() => undefined));

    renderForm();

    expect(screen.getByRole('status')).toHaveTextContent(/loading notification preferences/i);
  });

  it('shows the user’s saved preferences, not defaults', async () => {
    renderForm();

    expect(await screen.findByRole('checkbox', { name: /^email/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^push/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /pet matches/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /rescue updates/i })).toBeChecked();
    expect(screen.getByRole('combobox', { name: /digest/i })).toHaveTextContent(/daily/i);
    expect(screen.getByLabelText(/quiet hours start/i)).toHaveValue('22:00');
    expect(screen.getByLabelText(/quiet hours end/i)).toHaveValue('07:00');
    expect(screen.getByRole('combobox', { name: /timezone/i })).toHaveTextContent(/uk time/i);
  });

  it('keeps SMS switched off and explains why — there is no SMS provider (ADS-1325)', async () => {
    renderForm();

    const sms = await screen.findByRole('checkbox', { name: /^sms/i });
    expect(sms).toBeDisabled();
    expect(screen.getByText(/sms notifications are not available yet/i)).toBeInTheDocument();
  });

  it('saves every change the user made', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(await screen.findByRole('checkbox', { name: /^push/i }));
    await user.click(screen.getByRole('checkbox', { name: /^messages/i }));
    await user.click(screen.getByRole('combobox', { name: /digest/i }));
    await user.click(screen.getByRole('option', { name: /weekly/i }));
    await user.click(saveButton());

    await waitFor(() =>
      expect(updateNotificationPreferences).toHaveBeenCalledWith({
        ...SAVED,
        pushEnabled: true,
        chatMessages: false,
        digestFrequency: 'weekly',
      })
    );
    expect(await screen.findByText(/notification preferences saved/i)).toBeInTheDocument();
  });

  it('lets the user clear quiet hours', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(await screen.findByLabelText(/quiet hours start/i));
    await user.clear(screen.getByLabelText(/quiet hours end/i));
    await user.click(saveButton());

    await waitFor(() =>
      expect(updateNotificationPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ quietHoursStart: '', quietHoursEnd: '' })
      )
    );
  });

  it('asks for both quiet-hours times when only one is set', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(await screen.findByLabelText(/quiet hours end/i));
    await user.click(saveButton());

    expect(await screen.findByText(/set both a start and end time/i)).toBeInTheDocument();
    expect(updateNotificationPreferences).not.toHaveBeenCalled();
  });

  it('ties the quiet-hours error to the empty field so screen readers announce it there', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(await screen.findByLabelText(/quiet hours start/i));
    await user.click(saveButton());

    const start = await screen.findByLabelText(/quiet hours start/i);
    expect(start).toHaveAttribute('aria-invalid', 'true');
    expect(start).toHaveAccessibleDescription(/set both a start and end time/i);
    expect(screen.getByLabelText(/quiet hours end/i)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('always turns SMS off when saving — the backend rejects any save that enables it', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchNotificationPreferences).mockResolvedValue({ ...SAVED, smsEnabled: true });
    renderForm();

    await user.click(await screen.findByRole('checkbox', { name: /^push/i }));
    await user.click(saveButton());

    await waitFor(() =>
      expect(updateNotificationPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ smsEnabled: false, pushEnabled: true })
      )
    );
  });

  it('shows refreshed preferences over a stale cached copy without losing the user’s edits', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['notification-preferences', 'user-1'], SAVED);
    let resolveFetch: (prefs: NotificationPreferences) => void = () => undefined;
    vi.mocked(fetchNotificationPreferences).mockReturnValue(
      new Promise(resolve => {
        resolveFetch = resolve;
      })
    );
    renderForm(client);

    // Stale copy renders first; the user edits push before the refetch lands.
    await user.click(await screen.findByRole('checkbox', { name: /^push/i }));
    resolveFetch({ ...SAVED, emailEnabled: false });

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: /^email/i })).not.toBeChecked()
    );
    expect(screen.getByRole('checkbox', { name: /^push/i })).toBeChecked();
  });

  it('keeps the saved timezone selectable after the user picks another one', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchNotificationPreferences).mockResolvedValue({
      ...SAVED,
      timezone: 'America/New_York',
    });
    renderForm();

    await user.click(await screen.findByRole('combobox', { name: /timezone/i }));
    await user.click(screen.getByRole('option', { name: /uk time/i }));
    await user.click(screen.getByRole('combobox', { name: /timezone/i }));

    expect(screen.getByRole('option', { name: 'America/New_York' })).toBeInTheDocument();
  });

  it('keeps an unlisted saved timezone selectable instead of silently replacing it', async () => {
    vi.mocked(fetchNotificationPreferences).mockResolvedValue({
      ...SAVED,
      timezone: 'America/New_York',
    });

    renderForm();

    expect(await screen.findByRole('combobox', { name: /timezone/i })).toHaveTextContent(
      'America/New_York'
    );
  });

  it('tells the user when saving fails and keeps their changes', async () => {
    const user = userEvent.setup();
    vi.mocked(updateNotificationPreferences).mockRejectedValue(new Error('Network down'));
    renderForm();

    await user.click(await screen.findByRole('checkbox', { name: /^push/i }));
    await user.click(saveButton());

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/could not save your notification preferences/i)).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /^push/i })).toBeChecked();
  });

  it('tells the user when preferences cannot be loaded', async () => {
    vi.mocked(fetchNotificationPreferences).mockRejectedValue(new Error('down'));

    renderForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not load your notification preferences/i
    );
  });
});
