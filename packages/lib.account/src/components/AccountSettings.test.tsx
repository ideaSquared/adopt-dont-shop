import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUser = vi.hoisted(() => ({
  current: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    twoFactorEnabled: false,
  },
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  TwoFactorSettings: () => {
    // Stateful on purpose: stands in for the backup codes shown after enabling.
    const [codes, setCodes] = useState<string | null>(null);
    return (
      <div>
        <p>Two-factor controls</p>
        <button type='button' onClick={() => setCodes('ABCD-1234')}>
          Get backup codes
        </button>
        {codes && <p>{codes}</p>}
      </div>
    );
  },
  useAuth: () => ({ user: mockUser.current }),
}));

const mockSetThemeMode = vi.hoisted(() => vi.fn());

vi.mock('@adopt-dont-shop/lib.components', async importOriginal => ({
  ...(await importOriginal<typeof import('@adopt-dont-shop/lib.components')>()),
  useTheme: () => ({ themeMode: 'light', setThemeMode: mockSetThemeMode }),
}));

vi.mock('../hooks/use-notification-preferences', () => ({
  useNotificationPreferences: () => ({
    data: { emailEnabled: true, pushEnabled: false },
    isPending: false,
    isError: false,
  }),
}));

vi.mock('./NotificationPreferencesForm', () => ({
  NotificationPreferencesForm: () => <div>Notification controls</div>,
}));
vi.mock('./ChangePasswordForm', () => ({
  ChangePasswordForm: () => <div>Password controls</div>,
}));
vi.mock('./AccountDetailsForm', () => ({
  AccountDetailsForm: () => <div>Details controls</div>,
}));
vi.mock('./ChangeEmailForm', () => ({
  ChangeEmailForm: () => <div>Email controls</div>,
}));
vi.mock('./DeleteAccountSection', () => ({
  DeleteAccountSection: () => <div>Delete controls</div>,
}));

import { AccountSettings, type AccountSettingsSection } from './AccountSettings';

const Harness = ({
  initial = '',
  extraSections,
  showAccountDetails,
}: {
  initial?: string;
  extraSections?: ReadonlyArray<AccountSettingsSection>;
  showAccountDetails?: boolean;
}) => {
  const [open, setOpen] = useState(initial);
  return (
    <AccountSettings
      value={open}
      onChange={setOpen}
      extraSections={extraSections}
      showAccountDetails={showAccountDetails}
    />
  );
};

const rowTitles = () =>
  within(screen.getByRole('list', { name: /account settings/i }))
    .getAllByRole('heading')
    .map(heading => heading.textContent);

const row = (title: string) => {
  const item = screen.getByRole('heading', { name: title }).closest('li');
  if (!item) {
    throw new Error(`No settings row titled ${title}`);
  }
  return within(item);
};

describe('AccountSettings', () => {
  beforeEach(() => {
    mockUser.current = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      twoFactorEnabled: false,
    };
    mockSetThemeMode.mockClear();
  });

  it('lists every personal setting on one page', () => {
    render(<Harness />);

    expect(rowTitles()).toEqual([
      'Your details',
      'Email',
      'Password',
      'Two-factor sign-in',
      'Notifications',
      'Theme',
    ]);
  });

  it('shows the current value of each setting without opening anything', () => {
    render(<Harness />);

    expect(row('Your details').getByText('Jane Smith')).toBeInTheDocument();
    expect(row('Email').getByText('jane@example.com')).toBeInTheDocument();
    expect(row('Two-factor sign-in').getByText('Off')).toBeInTheDocument();
    expect(row('Notifications').getByText('Email on, browser alerts off')).toBeInTheDocument();
    expect(row('Theme').getByText('Light', { selector: 'p' })).toBeInTheDocument();
  });

  it('says two-factor sign-in is on when it is', () => {
    mockUser.current = { ...mockUser.current, twoFactorEnabled: true };
    render(<Harness />);

    expect(row('Two-factor sign-in').getByText('On')).toBeInTheDocument();
  });

  it('keeps every form closed until the user asks to change something', () => {
    render(<Harness />);

    expect(screen.getByText('Details controls')).not.toBeVisible();
    expect(screen.getByText('Password controls')).not.toBeVisible();
    expect(screen.getByText('Notification controls')).not.toBeVisible();
  });

  it.each([
    ['Change your details', 'Details controls'],
    ['Change email', 'Email controls'],
    ['Change password', 'Password controls'],
    ['Change two-factor sign-in', 'Two-factor controls'],
    ['Change notifications', 'Notification controls'],
  ])('%s opens that form', (button, content) => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: button }));

    expect(screen.getByText(content)).toBeVisible();
    expect(screen.getByRole('button', { name: button.replace('Change', 'Close') })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('opens one setting at a time, so the page stays short', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(screen.getByText('Password controls')).toBeVisible();
    expect(screen.getByText('Email controls')).not.toBeVisible();
  });

  it('closes a setting again', () => {
    render(<Harness initial='email' />);

    fireEvent.click(screen.getByRole('button', { name: 'Close email' }));

    expect(screen.getByText('Email controls')).not.toBeVisible();
  });

  it('keeps new backup codes on screen after switching sections and coming back', () => {
    render(<Harness initial='two-factor' />);
    fireEvent.click(screen.getByRole('button', { name: 'Get backup codes' }));

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByText('ABCD-1234')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Change two-factor sign-in' }));
    expect(screen.getByText('ABCD-1234')).toBeVisible();
  });

  it('keeps new backup codes after closing the two-factor row and reopening it', () => {
    render(<Harness initial='two-factor' />);
    fireEvent.click(screen.getByRole('button', { name: 'Get backup codes' }));

    fireEvent.click(screen.getByRole('button', { name: 'Close two-factor sign-in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change two-factor sign-in' }));

    expect(screen.getByText('ABCD-1234')).toBeVisible();
  });

  it('switches theme straight away from plain choices', () => {
    render(<Harness initial='theme' />);

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
  });

  it('keeps account deletion apart from the everyday settings', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { name: 'Delete account' })).toBeInTheDocument();
    expect(rowTitles()).not.toContain('Delete account');
    expect(screen.getByText('Delete controls')).toBeInTheDocument();
  });

  it('leaves out the details row when the app edits those fields elsewhere', () => {
    render(<Harness showAccountDetails={false} />);

    expect(rowTitles()).not.toContain('Your details');
  });

  it('opens nothing for an unknown section, so stale links still land on the list', () => {
    render(<Harness initial='security' />);

    expect(screen.queryByRole('button', { name: /^close/i })).not.toBeInTheDocument();
  });

  it('adds app-specific sections after the shared ones', () => {
    render(
      <Harness
        initial='privacy'
        extraSections={[
          {
            id: 'privacy',
            label: 'Privacy & data',
            summary: 'Profile visibility',
            content: <div>Privacy controls</div>,
          },
        ]}
      />
    );

    expect(rowTitles().slice(-1)[0]).toBe('Privacy & data');
    expect(row('Privacy & data').getByText('Profile visibility')).toBeInTheDocument();
    expect(screen.getByText('Privacy controls')).toBeVisible();
  });

  it('reports the open section so the app can keep it in the URL', () => {
    const onChange = vi.fn();
    render(<AccountSettings value='' onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(onChange).toHaveBeenCalledWith('password');
  });
});
