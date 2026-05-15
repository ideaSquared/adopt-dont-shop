import notificationService from '@/services/notificationService';
import { User } from '@/types';
import {
  Button,
  HIGH_CONTRAST_SHORTCUT_HINT,
  HighContrastToggle,
} from '@adopt-dont-shop/lib.components';
import { TwoFactorSettings } from '@adopt-dont-shop/lib.auth';
import React, { useEffect, useState } from 'react';
import * as styles from './SettingsForm.css';

interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    applications: boolean;
    messages: boolean;
    system: boolean;
    marketing: boolean;
    reminders: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showEmail: boolean;
    showPhone: boolean;
  };
  preferences: {
    petTypes: string[];
    maxDistance: number;
    newsletterOptIn: boolean;
  };
}

interface SettingsFormProps {
  user: User;
  onSave: (settings: Partial<UserSettings>) => Promise<void>;
  onDeleteAccount?: () => void;
  isLoading?: boolean;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  user,
  onSave,
  onDeleteAccount,
  isLoading = false,
}) => {
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      push: false,
      sms: false,
      applications: true,
      messages: true,
      system: true,
      marketing: false,
      reminders: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
    },
    preferences: {
      petTypes: user.preferences?.petTypes || [],
      maxDistance: user.preferences?.maxDistance || 25,
      newsletterOptIn: user.preferences?.newsletterOptIn || false,
    },
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Load notification preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await notificationService.getPreferences();

        setSettings(prev => ({
          ...prev,
          notifications: {
            email: prefs.email,
            push: prefs.push,
            sms: prefs.sms,
            applications: prefs.applications,
            messages: prefs.messages,
            system: prefs.system,
            marketing: prefs.marketing,
            reminders: prefs.reminders,
            quietHoursStart: prefs.quietHoursStart || '22:00',
            quietHoursEnd: prefs.quietHoursEnd || '08:00',
          },
        }));
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
        // Keep default values on error
      }
    };

    loadPreferences();
  }, []);

  const handleToggle = (section: keyof UserSettings, key: string) => {
    setSettings(prev => {
      const sectionData = prev[section] as Record<string, boolean | string | number | string[]>;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: !sectionData[key],
        },
      };
    });
    setHasChanges(true);
  };

  const handleSelectChange = (section: keyof UserSettings, key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleNumberChange = (section: keyof UserSettings, key: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Save notification preferences to backend
      await notificationService.updatePreferences({
        email: settings.notifications.email,
        push: settings.notifications.push,
        sms: settings.notifications.sms,
        applications: settings.notifications.applications,
        messages: settings.notifications.messages,
        system: settings.notifications.system,
        marketing: settings.notifications.marketing,
        reminders: settings.notifications.reminders,
        quietHoursStart: settings.notifications.quietHoursStart,
        quietHoursEnd: settings.notifications.quietHoursEnd,
      });

      // Save other settings via the onSave prop
      await onSave(settings);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Accessibility</h3>
        <div className={styles.settingItem}>
          <div className={styles.settingLabel}>
            <h4>High-Contrast Mode</h4>
            <p>
              Increases text and border contrast to meet WCAG AA. Toggle with{' '}
              <kbd>{HIGH_CONTRAST_SHORTCUT_HINT}</kbd>.
            </p>
          </div>
          <div className={styles.settingControl}>
            <HighContrastToggle />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Security</h3>
        <div className={styles.settingItem}>
          <div className={styles.settingLabel}>
            <h4>Two-Factor Authentication</h4>
            <p>Protect your account with an authenticator app</p>
          </div>
        </div>
        <TwoFactorSettings />
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Notification Preferences</h3>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Email Notifications</h4>
              <p>Receive updates about your applications and new pet matches</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='Email Notifications'>
                <input
                  type='checkbox'
                  checked={settings.notifications.email}
                  onChange={() => handleToggle('notifications', 'email')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Push Notifications</h4>
              <p>Get instant updates on your device</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='Push Notifications'>
                <input
                  type='checkbox'
                  checked={settings.notifications.push}
                  onChange={() => handleToggle('notifications', 'push')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>SMS Notifications</h4>
              <p>Receive text messages for urgent updates</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='SMS Notifications'>
                <input
                  type='checkbox'
                  checked={settings.notifications.sms}
                  onChange={() => handleToggle('notifications', 'sms')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Application Updates</h4>
              <p>Get notified when your adoption applications change status</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='Application Updates'>
                <input
                  type='checkbox'
                  checked={settings.notifications.applications}
                  onChange={() => handleToggle('notifications', 'applications')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Messages</h4>
              <p>Receive notifications for new messages from rescue organizations</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='Messages'>
                <input
                  type='checkbox'
                  checked={settings.notifications.messages}
                  onChange={() => handleToggle('notifications', 'messages')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>System Notifications</h4>
              <p>Important system updates and announcements</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='System Notifications'>
                <input
                  type='checkbox'
                  checked={settings.notifications.system}
                  onChange={() => handleToggle('notifications', 'system')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Marketing &amp; Promotions</h4>
              <p>Receive updates about special events and adoption promotions</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='Marketing &amp; Promotions'>
                <input
                  type='checkbox'
                  checked={settings.notifications.marketing}
                  onChange={() => handleToggle('notifications', 'marketing')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Reminders</h4>
              <p>Get reminders about incomplete applications and follow-ups</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='Reminders'>
                <input
                  type='checkbox'
                  checked={settings.notifications.reminders}
                  onChange={() => handleToggle('notifications', 'reminders')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Privacy Settings</h3>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Profile Visibility</h4>
              <p>Control who can see your profile information</p>
            </div>
            <div className={styles.settingControl}>
              <select
                className={styles.select}
                value={settings.privacy.profileVisibility}
                onChange={e => handleSelectChange('privacy', 'profileVisibility', e.target.value)}
                disabled={isLoading}
              >
                <option value='public'>Public</option>
                <option value='private'>Private</option>
              </select>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Show Email Address</h4>
              <p>Allow rescue organizations to see your email</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='Show Email Address'>
                <input
                  type='checkbox'
                  checked={settings.privacy.showEmail}
                  onChange={() => handleToggle('privacy', 'showEmail')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Show Phone Number</h4>
              <p>Allow rescue organizations to see your phone number</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='Show Phone Number'>
                <input
                  type='checkbox'
                  checked={settings.privacy.showPhone}
                  onChange={() => handleToggle('privacy', 'showPhone')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Pet Preferences</h3>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Newsletter Subscription</h4>
              <p>Receive weekly updates about new pets and adoption stories</p>
            </div>
            <div className={styles.settingControl}>
              <label className={styles.switchLabel} aria-label='Newsletter Subscription'>
                <input
                  type='checkbox'
                  checked={settings.preferences.newsletterOptIn}
                  onChange={() => handleToggle('preferences', 'newsletterOptIn')}
                  disabled={isLoading}
                />
                <span />
              </label>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Search Radius</h4>
              <p>Maximum distance to search for pets (miles)</p>
            </div>
            <div className={styles.settingControl}>
              <select
                className={styles.select}
                value={settings.preferences.maxDistance.toString()}
                onChange={e =>
                  handleNumberChange('preferences', 'maxDistance', parseInt(e.target.value))
                }
                disabled={isLoading}
              >
                <option value='10'>10 miles</option>
                <option value='25'>25 miles</option>
                <option value='50'>50 miles</option>
                <option value='100'>100 miles</option>
                <option value='250'>250 miles</option>
                <option value='500'>500+ miles</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Quiet Hours</h3>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Quiet Hours Start</h4>
              <p>Time when non-urgent notifications will be paused</p>
            </div>
            <div className={styles.settingControl}>
              <select
                className={styles.select}
                value={settings.notifications.quietHoursStart || '22:00'}
                onChange={e =>
                  handleSelectChange('notifications', 'quietHoursStart', e.target.value)
                }
                disabled={isLoading}
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  return (
                    <option key={hour} value={`${hour}:00`}>
                      {hour}:00
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              <h4>Quiet Hours End</h4>
              <p>Time when notifications will resume</p>
            </div>
            <div className={styles.settingControl}>
              <select
                className={styles.select}
                value={settings.notifications.quietHoursEnd || '08:00'}
                onChange={e => handleSelectChange('notifications', 'quietHoursEnd', e.target.value)}
                disabled={isLoading}
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  return (
                    <option key={hour} value={`${hour}:00`}>
                      {hour}:00
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {hasChanges && (
          <div className={styles.buttonGroup}>
            <Button
              type='button'
              variant='secondary'
              onClick={() => {
                // Reset to original settings
                setSettings({
                  notifications: {
                    email: true,
                    push: false,
                    sms: false,
                    applications: true,
                    messages: true,
                    system: true,
                    marketing: false,
                    reminders: true,
                    quietHoursStart: '22:00',
                    quietHoursEnd: '08:00',
                  },
                  privacy: {
                    profileVisibility: 'public',
                    showEmail: false,
                    showPhone: false,
                  },
                  preferences: {
                    petTypes: user.preferences?.petTypes || [],
                    maxDistance: user.preferences?.maxDistance || 25,
                    newsletterOptIn: user.preferences?.newsletterOptIn || false,
                  },
                });
                setHasChanges(false);
              }}
              disabled={isLoading}
            >
              Cancel Changes
            </Button>
            <Button type='submit' isLoading={isLoading} disabled={isLoading}>
              Save Settings
            </Button>
          </div>
        )}
      </form>

      <div className={styles.dangerZone}>
        <h3>Danger Zone</h3>
        <p>
          Once you delete your account, there is no going back. This will permanently delete your
          profile, applications, and all associated data.
        </p>
        <Button variant='secondary' onClick={onDeleteAccount} disabled={isLoading}>
          Delete Account
        </Button>
      </div>
    </div>
  );
};

export default SettingsForm;
