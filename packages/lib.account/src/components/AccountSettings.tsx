import React from 'react';
import { TwoFactorSettings, useAuth } from '@adopt-dont-shop/lib.auth';
import { Button, useTheme, type ThemeMode } from '@adopt-dont-shop/lib.components';
import { useNotificationPreferences } from '../hooks/use-notification-preferences';
import { AccountDetailsForm } from './AccountDetailsForm';
import { ChangeEmailForm } from './ChangeEmailForm';
import { ChangePasswordForm } from './ChangePasswordForm';
import { DeleteAccountSection } from './DeleteAccountSection';
import { NotificationPreferencesForm } from './NotificationPreferencesForm';
import * as styles from './AccountSettings.css';

export type AccountSettingsSection = {
  id: string;
  label: string;
  /** The current value, shown while the section is closed. */
  summary?: React.ReactNode;
  content: React.ReactNode;
};

const THEME_OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'normal', label: 'Cosy' },
  { value: 'dark', label: 'Dark' },
];

const themeLabel = (mode: ThemeMode): string =>
  THEME_OPTIONS.find(option => option.value === mode)?.label ?? mode;

// Applies on click, no Save button: the change is visible straight away.
const ThemeChoice = () => {
  const { themeMode, setThemeMode } = useTheme();
  return (
    <fieldset className={styles.themeChoices}>
      <legend className={styles.themeLegend}>Choose how the app looks</legend>
      {THEME_OPTIONS.map(option => (
        <label
          key={option.value}
          htmlFor={`account-theme-${option.value}`}
          className={styles.themeOption}
        >
          <input
            id={`account-theme-${option.value}`}
            type='radio'
            name='account-theme'
            // Same text as the wrapping label; the lint rule can't see that.
            aria-label={option.label}
            value={option.value}
            checked={themeMode === option.value}
            onChange={() => setThemeMode(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
};

const onOff = (enabled: boolean): string => (enabled ? 'on' : 'off');

const NotificationSummary = () => {
  const { data } = useNotificationPreferences();
  if (!data) {
    return null;
  }
  return <>{`Email ${onOff(data.emailEnabled)}, browser alerts ${onOff(data.pushEnabled)}`}</>;
};

type RowProps = { section: AccountSettingsSection; isOpen: boolean; onToggle: () => void };

const SettingRow = ({ section, isOpen, onToggle }: RowProps) => {
  const name = section.label.toLowerCase();
  return (
    <li className={styles.row}>
      <div className={styles.rowHeader}>
        <div className={styles.rowText}>
          <h3 className={styles.rowTitle}>{section.label}</h3>
          {section.summary && <p className={styles.rowSummary}>{section.summary}</p>}
        </div>
        <Button
          variant='secondary'
          size='sm'
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Close' : 'Change'} ${name}`}
          onClick={onToggle}
        >
          {isOpen ? 'Close' : 'Change'}
        </Button>
      </div>
      {isOpen && <div className={styles.rowBody}>{section.content}</div>}
    </li>
  );
};

export type AccountSettingsProps = {
  /** Id of the open section, or '' for none. An unknown id opens nothing. */
  value: string;
  onChange: (id: string) => void;
  /** App-specific sections, listed after the shared ones. */
  extraSections?: ReadonlyArray<AccountSettingsSection>;
  /**
   * Show the name/phone row. Off for an app that already edits those fields
   * elsewhere (app.client's Profile tab).
   */
  showAccountDetails?: boolean;
};

/**
 * The signed-in user's personal settings, identical in every app: one list
 * showing each setting's current value, with a Change button that opens that
 * setting's form. One section opens at a time. Controlled, so each app decides
 * where the open section lives (state, URL hash, …). Needs the app's
 * AuthProvider, ThemeProvider and QueryClientProvider above it.
 */
export const AccountSettings = ({
  value,
  onChange,
  extraSections = [],
  showAccountDetails = true,
}: AccountSettingsProps) => {
  const { user } = useAuth();
  const { themeMode } = useTheme();
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

  const sections: ReadonlyArray<AccountSettingsSection> = [
    ...(showAccountDetails
      ? [
          {
            id: 'details',
            label: 'Your details',
            summary: fullName || 'Not set',
            content: <AccountDetailsForm />,
          },
        ]
      : []),
    { id: 'email', label: 'Email', summary: user?.email, content: <ChangeEmailForm /> },
    { id: 'password', label: 'Password', summary: '••••••••', content: <ChangePasswordForm /> },
    {
      id: 'two-factor',
      label: 'Two-factor sign-in',
      summary: user?.twoFactorEnabled ? 'On' : 'Off',
      content: <TwoFactorSettings />,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      summary: <NotificationSummary />,
      content: <NotificationPreferencesForm />,
    },
    { id: 'theme', label: 'Theme', summary: themeLabel(themeMode), content: <ThemeChoice /> },
    ...extraSections,
  ];

  return (
    <div className={styles.container}>
      <ul className={styles.list} aria-label='Account settings'>
        {sections.map(section => (
          <SettingRow
            key={section.id}
            section={section}
            isOpen={section.id === value}
            onToggle={() => onChange(section.id === value ? '' : section.id)}
          />
        ))}
      </ul>

      <section className={styles.dangerZone}>
        <h3 className={styles.rowTitle}>Delete account</h3>
        <DeleteAccountSection />
      </section>
    </div>
  );
};
