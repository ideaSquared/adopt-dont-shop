import React from 'react';
import { TwoFactorSettings } from '@adopt-dont-shop/lib.auth';
import { Tabs, ThemeToggle } from '@adopt-dont-shop/lib.components';
import { AccountDetailsForm } from './AccountDetailsForm';
import { ChangeEmailForm } from './ChangeEmailForm';
import { ChangePasswordForm } from './ChangePasswordForm';
import { DeleteAccountSection } from './DeleteAccountSection';
import { NotificationPreferencesForm } from './NotificationPreferencesForm';
import * as styles from './AccountSettings.css';

export type AccountSettingsTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type PanelProps = { title: string; description?: string; children: React.ReactNode };

const Panel = ({ title, description, children }: PanelProps) => (
  <section className={styles.panel}>
    <h3 className={styles.panelTitle}>{title}</h3>
    {description && <p className={styles.panelDescription}>{description}</p>}
    {children}
  </section>
);

const sharedTabs = (showAccountDetails: boolean): ReadonlyArray<AccountSettingsTab> => [
  { id: 'notifications', label: 'Notifications', content: <NotificationPreferencesForm /> },
  {
    id: 'security',
    label: 'Security',
    content: (
      <div className={styles.panelStack}>
        <Panel title='Password'>
          <ChangePasswordForm />
        </Panel>
        <Panel
          title='Two-factor authentication'
          description='Add an extra layer of security by asking for a code from your authenticator app when you sign in.'
        >
          <TwoFactorSettings />
        </Panel>
      </div>
    ),
  },
  {
    id: 'appearance',
    label: 'Appearance',
    content: (
      <Panel
        title='Theme'
        description='Choose the theme that feels best to you — light, cosy (warm cream), or dark.'
      >
        <ThemeToggle />
      </Panel>
    ),
  },
  {
    id: 'account',
    label: 'Account',
    content: (
      <div className={styles.panelStack}>
        {showAccountDetails && (
          <Panel title='Your details'>
            <AccountDetailsForm />
          </Panel>
        )}
        <Panel title='Email'>
          <ChangeEmailForm />
        </Panel>
        <Panel title='Delete account'>
          <DeleteAccountSection />
        </Panel>
      </div>
    ),
  },
];

const DEFAULT_TAB = 'notifications';

export type AccountSettingsProps = {
  /** Id of the active tab. An unknown id shows the first tab (Notifications). */
  value: string;
  onChange: (id: string) => void;
  /** App-specific tabs, shown after the shared Notifications / Security / Appearance / Account tabs. */
  extraTabs?: ReadonlyArray<AccountSettingsTab>;
  /**
   * Show the name/phone form in the Account tab. Off for an app that already
   * edits those fields elsewhere (app.client's Profile tab).
   */
  showAccountDetails?: boolean;
};

/**
 * The signed-in user's personal settings, identical in every app. Controlled,
 * so each app decides where the active tab lives (state, URL hash, …). Needs
 * the app's AuthProvider, ThemeProvider and QueryClientProvider above it.
 */
export const AccountSettings = ({
  value,
  onChange,
  extraTabs = [],
  showAccountDetails = true,
}: AccountSettingsProps) => {
  const tabs = [...sharedTabs(showAccountDetails), ...extraTabs];
  const active = tabs.some(tab => tab.id === value) ? value : DEFAULT_TAB;

  return (
    <Tabs tabs={tabs} value={active} onChange={onChange} aria-label='Account settings sections' />
  );
};
