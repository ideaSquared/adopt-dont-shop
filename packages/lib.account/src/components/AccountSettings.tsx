import React from 'react';
import { TwoFactorSettings } from '@adopt-dont-shop/lib.auth';
import { Tabs, ThemeToggle } from '@adopt-dont-shop/lib.components';
import { NotificationPreferencesForm } from './NotificationPreferencesForm';
import * as styles from './AccountSettings.css';

export type AccountSettingsTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

const SHARED_TABS: ReadonlyArray<AccountSettingsTab> = [
  { id: 'notifications', label: 'Notifications', content: <NotificationPreferencesForm /> },
  {
    id: 'security',
    label: 'Security',
    content: (
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Two-factor authentication</h3>
        <p className={styles.panelDescription}>
          Add an extra layer of security by asking for a code from your authenticator app when you
          sign in.
        </p>
        <TwoFactorSettings />
      </section>
    ),
  },
  {
    id: 'appearance',
    label: 'Appearance',
    content: (
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Theme</h3>
        <p className={styles.panelDescription}>
          Choose the theme that feels best to you — light, cosy (warm cream), or dark.
        </p>
        <ThemeToggle />
      </section>
    ),
  },
];

export type AccountSettingsProps = {
  /** Id of the active tab. An unknown id shows the first tab (Notifications). */
  value: string;
  onChange: (id: string) => void;
  /** App-specific tabs, shown after the shared Notifications / Security / Appearance tabs. */
  extraTabs?: ReadonlyArray<AccountSettingsTab>;
};

/**
 * The signed-in user's personal settings, identical in every app. Controlled,
 * so each app decides where the active tab lives (state, URL hash, …). Needs
 * the app's AuthProvider, ThemeProvider and QueryClientProvider above it.
 */
export const AccountSettings = ({ value, onChange, extraTabs = [] }: AccountSettingsProps) => {
  const tabs = [...SHARED_TABS, ...extraTabs];
  const active = tabs.some(tab => tab.id === value) ? value : SHARED_TABS[0].id;

  return (
    <Tabs tabs={tabs} value={active} onChange={onChange} aria-label='Account settings sections' />
  );
};
