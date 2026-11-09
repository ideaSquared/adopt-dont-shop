import { User } from '@/types';
import {
  Button,
  CheckboxInput,
  FormField,
  SelectInput,
  type SelectOption,
} from '@adopt-dont-shop/lib.components';
import React, { useState } from 'react';
import * as styles from './SettingsForm.css';

// Adopter-only settings. Notifications, security and appearance live in the
// shared AccountSettings tabs (@adopt-dont-shop/lib.account).
interface UserSettings {
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

// SelectInput yields `string | string[]`; every select here is single-value.
const singleValue = (value: string | string[]): string =>
  Array.isArray(value) ? (value[0] ?? '') : value;

export const SettingsForm: React.FC<SettingsFormProps> = ({ user, onSave, isLoading = false }) => {
  const [settings, setSettings] = useState<UserSettings>({
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
      await onSave(settings);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit}>
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

        {hasChanges && (
          <div className={styles.buttonGroup}>
            <Button
              type='button'
              variant='secondary'
              onClick={() => {
                // Reset to original settings
                setSettings({
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
    </div>
  );
};

export default SettingsForm;
