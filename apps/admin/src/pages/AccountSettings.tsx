import React, { useState } from 'react';
import { AccountSettings as SharedAccountSettings } from '@adopt-dont-shop/lib.account';
import { PageHeader } from '@adopt-dont-shop/lib.components';
import * as styles from './AccountSettings.css';

const AccountSettings: React.FC = () => {
  const [openSection, setOpenSection] = useState('');

  return (
    <div className={styles.pageContainer}>
      <PageHeader
        title='Account Settings'
        description='Check your details and change anything that needs updating.'
      />

      <SharedAccountSettings value={openSection} onChange={setOpenSection} />
    </div>
  );
};

export default AccountSettings;
