import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AccountSettings } from '@adopt-dont-shop/lib.account';
import * as styles from './RescueSettings.css';

const DEFAULT_TAB = 'notifications';

// Personal settings: open to every signed-in user, no rescue permission needed.
// The active tab lives in the URL hash so it survives reloads and deep links.
const UserSettings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const setActiveTab = useCallback(
    (tab: string) => {
      const hash = tab === DEFAULT_TAB ? '' : `#${tab}`;
      navigate(`${location.pathname}${hash}`, { replace: true });
    },
    [navigate, location.pathname]
  );

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>My Settings</h1>
        <p>Manage your own notifications, security, appearance and account.</p>
      </div>

      <AccountSettings value={location.hash.replace('#', '')} onChange={setActiveTab} />
    </div>
  );
};

export default UserSettings;
