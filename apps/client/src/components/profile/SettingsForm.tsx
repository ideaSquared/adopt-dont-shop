import notificationService from '@/services/notificationService';
import { User } from '@/types';
import {
  Button,
  CheckboxInput,
  FormField,
  SelectInput,
  ThemeToggle,
  type SelectOption,
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

const profileVisibilityOptions: SelectOption[] = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
];

const searchRadiusOptions: SelectOption[] = [
  { value: '10', label: '10 miles' },
  { value: '25', label: '25 miles' },
  { value: '50', label: '50 miles' },
  { value: '100', label: '100 miles' },
  { value: '250', label: '250 miles' },
  { value: '500', label: '500+ miles' },
];

const hourOptions: SelectOption[] = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

// SelectInput yields `string | string[]`; every select here is single-value.
const singleValue = (value: string | string[]): string =>
  Array.isArray(value) ? (value[0] ?? '') : value;

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
        <h3 className={styles.sectionTitle}>Appearance</h3>
        <div className={styles.settingItem}>
          <div className={styles.settingLabel}>
            <h4>Theme</h4>
            <p>Choose how the app looks — light, cosy (warm cream), or dark.</p>
          </div>
          <div className={styles.settingControl}>
            <ThemeToggle />
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
            <FormField description='Receive updates about your applications and new pet matches'>
              <CheckboxInput
                label='Email Notifications'
                checked={settings.notifications.email}
                onChange={() => handleToggle('notifications', 'email')}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.settingItem}>
            <FormField description='Get instant updates on your device'>
              <CheckboxInput
                label='Push Notifications'
                checked={settings.notifications.push}
                onChange={() => handleToggle('notifications', 'push')}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.settingItem}>
            <FormField description='Receive text messages for urgent updates'>
              <CheckboxInput
                label='SMS Notifications'
                checked={settings.notifications.sms}
                onChange={() => handleToggle('notifications', 'sms')}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.settingItem}>
            <FormField description='Get notified when your adoption applications change status'>
              <CheckboxInput
                label='Application Updates'
                checked={settings.notifications.applications}
                onChange={() => handleToggle('notifications', 'applications')}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.settingItem}>
            <FormField description='Receive notifications for new messages from rescue organizations'>
              <CheckboxInput
                label='Messages'
                checked={settings.notifications.messages}
                onChange={() => handleToggle('notifications', 'messages')}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.settingItem}>
            <FormField description='Important system updates and announcements'>
              <CheckboxInput
                label='System Notifications'
                checked={settings.notifications.system}
                onChange={() => handleToggle('notifications', 'system')}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.settingItem}>
            <FormField description='Receive updates about special events and adoption promotions'>
              <CheckboxInput
                label='Marketing & Promotions'
                checked={settings.notifications.marketing}
                onChange={() => handleToggle('notifications', 'marketing')}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.settingItem}>
            <FormField description='Get reminders about incomplete applications and follow-ups'>
              <CheckboxInput
                label='Reminders'
                checked={settings.notifications.reminders}
                onChange={() => handleToggle('notifications', 'reminders')}
                disabled={isLoading}
              />
            </FormField>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Privacy Settings</h3>

          <div className={styles.settingItem}>
            <SelectInput
              label='Profile Visibility'
              helperText='Control who can see your profile information'
              value={settings.privacy.profileVisibility}
              onChange={value =>
                handleSelectChange('privacy', 'profileVisibility', singleValue(value))
              }
              options={profileVisibilityOptions}
              disabled={isLoading}
              data-testid='setting-profile-visibility'
              fullWidth
            />
          </div>

          <div className={styles.settingItem}>
            <FormField description='Allow rescue organizations to see your email'>
              <CheckboxInput
                label='Show Email Address'
                checked={settings.privacy.showEmail}
                onChange={() => handleToggle('privacy', 'showEmail')}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.settingItem}>
            <FormField description='Allow rescue organizations to see your phone number'>
              <CheckboxInput
                label='Show Phone Number'
                checked={settings.privacy.showPhone}
                onChange={() => handleToggle('privacy', 'showPhone')}
                disabled={isLoading}
              />
            </FormField>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Pet Preferences</h3>

          <div className={styles.settingItem}>
            <FormField description='Receive weekly updates about new pets and adoption stories'>
              <CheckboxInput
                label='Newsletter Subscription'
                checked={settings.preferences.newsletterOptIn}
                onChange={() => handleToggle('preferences', 'newsletterOptIn')}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.settingItem}>
            <SelectInput
              label='Search Radius'
              helperText='Maximum distance to search for pets (miles)'
              value={settings.preferences.maxDistance.toString()}
              onChange={value =>
                handleNumberChange('preferences', 'maxDistance', parseInt(singleValue(value), 10))
              }
              options={searchRadiusOptions}
              disabled={isLoading}
              data-testid='setting-search-radius'
              fullWidth
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Quiet Hours</h3>

          <div className={styles.settingItem}>
            <SelectInput
              label='Quiet Hours Start'
              helperText='Time when non-urgent notifications will be paused'
              value={settings.notifications.quietHoursStart || '22:00'}
              onChange={value =>
                handleSelectChange('notifications', 'quietHoursStart', singleValue(value))
              }
              options={hourOptions}
              disabled={isLoading}
              data-testid='setting-quiet-hours-start'
              fullWidth
            />
          </div>

          <div className={styles.settingItem}>
            <SelectInput
              label='Quiet Hours End'
              helperText='Time when notifications will resume'
              value={settings.notifications.quietHoursEnd || '08:00'}
              onChange={value =>
                handleSelectChange('notifications', 'quietHoursEnd', singleValue(value))
              }
              options={hourOptions}
              disabled={isLoading}
              data-testid='setting-quiet-hours-end'
              fullWidth
            />
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
