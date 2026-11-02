import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { TwoFactorSettings } from '@adopt-dont-shop/lib.auth';
import { Tabs, ThemeToggle } from '@adopt-dont-shop/lib.components';
import NotificationPreferencesForm from '../components/rescue/NotificationPreferencesForm';
import * as styles from './RescueSettings.css';

type TabType = 'preferences' | 'security' | 'appearance';

const TABS: ReadonlyArray<{ id: TabType; label: string; content: React.ReactNode }> = [
  { id: 'preferences', label: 'Preferences', content: <NotificationPreferencesForm /> },
  {
    id: 'security',
    label: 'Security',
    content: (
      <div className={styles.securitySection}>
        <h2>Two-Factor Authentication</h2>
        <p>
          Add an extra layer of security to your account by requiring a verification code when you
          sign in.
        </p>
        <TwoFactorSettings />
      </div>
    ),
  },
  {
    id: 'appearance',
    label: 'Appearance',
    content: (
      <div className={styles.securitySection}>
        <h2>Theme</h2>
        <p>Choose how the rescue tools look — light, cosy (warm cream), or dark.</p>
        <ThemeToggle />
      </div>
    ),
  },
];

const parseTabFromHash = (hash: string): TabType =>
  TABS.find(tab => tab.id === hash.replace('#', ''))?.id ?? 'preferences';

// Personal settings: open to every signed-in user, no rescue permission needed.
const UserSettings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = parseTabFromHash(location.hash);

  const setActiveTab = useCallback(
    (tab: TabType) => {
      const hash = tab === 'preferences' ? '' : `#${tab}`;
      navigate(`${location.pathname}${hash}`, { replace: true });
    },
    [navigate, location.pathname]
  );

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>My Settings</h1>
        <p>Manage your own notifications, account security and appearance.</p>
      </div>

      <Tabs
        tabs={TABS}
        value={activeTab}
        onChange={id => setActiveTab(parseTabFromHash(id))}
        aria-label="My settings sections"
      />
    </div>
  );
};

export default UserSettings;
