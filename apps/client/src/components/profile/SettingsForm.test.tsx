import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test-utils/render';
import userEvent from '@testing-library/user-event';
import { createMockUser } from '@adopt-dont-shop/lib.dev-tools';
import { SettingsForm } from './SettingsForm';

const baseUser = createMockUser({
  userId: 'user-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
});

describe('SettingsForm', () => {
  it('renders each adopter setting with an accessible label', () => {
    render(<SettingsForm user={baseUser} onSave={vi.fn()} />);

    // Privacy + preference dropdowns are labelled comboboxes.
    expect(screen.getByLabelText(/profile visibility/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/search radius/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/show email address/i)).toHaveProperty('type', 'checkbox');
    expect(screen.getByLabelText(/newsletter subscription/i)).toBeInTheDocument();

    // Descriptions remain as accessible help text.
    expect(screen.getByText(/allow rescue organizations to see your email/i)).toBeInTheDocument();
  });

  it('leaves notifications, security and appearance to the shared account settings', () => {
    render(<SettingsForm user={baseUser} onSave={vi.fn()} />);

    expect(screen.queryByText(/notification preferences/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/two-factor authentication/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/appearance/i)).not.toBeInTheDocument();
  });

  it('renders each dropdown showing its current value', () => {
    render(<SettingsForm user={baseUser} onSave={vi.fn()} />);

    // Defaults: public profile, 25 mile radius.
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('25 miles')).toBeInTheDocument();
  });

  it('reveals the save controls only after a setting changes', async () => {
    const user = userEvent.setup();
    render(<SettingsForm user={baseUser} onSave={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /save settings/i })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/show email address/i));

    expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
  });

  it('saves the changed settings through the onSave prop', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SettingsForm user={baseUser} onSave={onSave} />);

    await user.click(screen.getByLabelText(/show email address/i));
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      privacy: { showEmail: true },
      preferences: { maxDistance: 25 },
    });
  });
});
