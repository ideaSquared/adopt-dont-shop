import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AccountSettings } from '@adopt-dont-shop/lib.account';
import { PageHeader } from '@adopt-dont-shop/lib.components';
import * as styles from './RescueSettings.css';

// Personal settings: open to every signed-in user, no rescue permission needed.
// The open section lives in the URL hash so it survives reloads and deep links.
const UserSettings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const setOpenSection = useCallback(
    (section: string) => {
      const hash = section ? `#${section}` : '';
      navigate(`${location.pathname}${hash}`, { replace: true });
    },
    [navigate, location.pathname]
  );

  return (
    <div className={styles.pageContainer}>
      <PageHeader
        title="My Settings"
        description="Check your details and change anything that needs updating."
      />

      <AccountSettings value={location.hash.replace('#', '')} onChange={setOpenSection} />
    </div>
  );
};

export default UserSettings;
