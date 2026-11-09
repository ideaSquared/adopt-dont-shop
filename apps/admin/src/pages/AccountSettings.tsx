import React, { useState } from 'react';
import { AccountSettings as SharedAccountSettings } from '@adopt-dont-shop/lib.account';
import * as styles from './AccountSettings.css';

const AccountSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('notifications');

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Account Settings</h1>
        <p>Manage your notifications, security, appearance and account.</p>
      </div>

      <SharedAccountSettings value={activeTab} onChange={setActiveTab} />
    </div>
  );
};

export default AccountSettings;
