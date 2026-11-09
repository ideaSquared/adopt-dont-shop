import React, { useState } from 'react';
import { AccountSettings as SharedAccountSettings } from '@adopt-dont-shop/lib.account';
import * as styles from './AccountSettings.css';

const AccountSettings: React.FC = () => {
  const [openSection, setOpenSection] = useState('');

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Account Settings</h1>
        <p>Check your details and change anything that needs updating.</p>
      </div>

      <SharedAccountSettings value={openSection} onChange={setOpenSection} />
    </div>
  );
};

export default AccountSettings;
