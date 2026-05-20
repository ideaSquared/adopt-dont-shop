import React from 'react';
import { TwoFactorSettings } from '@adopt-dont-shop/lib.auth';
import { ThemeToggle } from '@adopt-dont-shop/lib.components';
import * as styles from './AccountSettings.css';

const AccountSettings: React.FC = () => {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Account Settings</h1>
        <p>Manage your account security and accessibility settings.</p>
      </div>

      <div className={styles.section}>
        <h2>Appearance</h2>
        <p>Choose the theme that feels best to you — light, cosy (warm cream), or dark.</p>
        <ThemeToggle />
      </div>

      <div className={styles.section}>
        <h2>Two-Factor Authentication</h2>
        <p>
          Add an extra layer of security to your admin account by requiring a verification code when
          you sign in.
        </p>
        <TwoFactorSettings />
      </div>
    </div>
  );
};

export default AccountSettings;
