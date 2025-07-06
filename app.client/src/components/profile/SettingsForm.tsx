import { User } from '@/types';
import { Button } from '@adopt-dont-shop/components';
import React, { useState } from 'react';
import styled from 'styled-components';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Section = styled.div`
  background: ${props => props.theme.background.secondary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 8px;
  padding: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 1rem;
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const SettingLabel = styled.div`
  flex: 1;

  h4 {
    font-size: 1rem;
    color: ${props => props.theme.text.primary};
    margin-bottom: 0.25rem;
  }

  p {
    font-size: 0.875rem;
    color: ${props => props.theme.text.secondary};
    margin: 0;
  }
`;

const SettingControl = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.colors.neutral[300]};
    transition: 0.3s;
    border-radius: 24px;
  }

  span:before {
    position: absolute;
    content: '';
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + span {
    background-color: ${props => props.theme.colors.primary[500]};
  }

  input:checked + span:before {
    transform: translateX(26px);
  }
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 6px;
  background: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};
  font-size: 0.875rem;
  min-width: 150px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const DangerZone = styled.div`
  border: 1px solid ${props => props.theme.colors.semantic.error[300]};
  border-radius: 8px;
  padding: 1.5rem;
  background: ${props => props.theme.colors.semantic.error[50]};

  h3 {
    color: ${props => props.theme.colors.semantic.error[700]};
    margin-bottom: 1rem;
  }

  p {
    color: ${props => props.theme.colors.semantic.error[600]};
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
`;

interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
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
    <Form onSubmit={handleSubmit}>
      <Section>
        <SectionTitle>Notification Preferences</SectionTitle>

        <SettingItem>
          <SettingLabel>
            <h4>Email Notifications</h4>
            <p>Receive updates about your applications and new pet matches</p>
          </SettingLabel>
          <SettingControl>
            <Switch>
              <input
                type='checkbox'
                checked={settings.notifications.email}
                onChange={() => handleToggle('notifications', 'email')}
                disabled={isLoading}
              />
              <span />
            </Switch>
          </SettingControl>
        </SettingItem>

        <SettingItem>
          <SettingLabel>
            <h4>Push Notifications</h4>
            <p>Get instant updates on your device</p>
          </SettingLabel>
          <SettingControl>
            <Switch>
              <input
                type='checkbox'
                checked={settings.notifications.push}
                onChange={() => handleToggle('notifications', 'push')}
                disabled={isLoading}
              />
              <span />
            </Switch>
          </SettingControl>
        </SettingItem>

        <SettingItem>
          <SettingLabel>
            <h4>SMS Notifications</h4>
            <p>Receive text messages for urgent updates</p>
          </SettingLabel>
          <SettingControl>
            <Switch>
              <input
                type='checkbox'
                checked={settings.notifications.sms}
                onChange={() => handleToggle('notifications', 'sms')}
                disabled={isLoading}
              />
              <span />
            </Switch>
          </SettingControl>
        </SettingItem>
      </Section>

      <Section>
        <SectionTitle>Privacy Settings</SectionTitle>

        <SettingItem>
          <SettingLabel>
            <h4>Profile Visibility</h4>
            <p>Control who can see your profile information</p>
          </SettingLabel>
          <SettingControl>
            <Select
              value={settings.privacy.profileVisibility}
              onChange={e => handleSelectChange('privacy', 'profileVisibility', e.target.value)}
              disabled={isLoading}
            >
              <option value='public'>Public</option>
              <option value='private'>Private</option>
            </Select>
          </SettingControl>
        </SettingItem>

        <SettingItem>
          <SettingLabel>
            <h4>Show Email Address</h4>
            <p>Allow rescue organizations to see your email</p>
          </SettingLabel>
          <SettingControl>
            <Switch>
              <input
                type='checkbox'
                checked={settings.privacy.showEmail}
                onChange={() => handleToggle('privacy', 'showEmail')}
                disabled={isLoading}
              />
              <span />
            </Switch>
          </SettingControl>
        </SettingItem>

        <SettingItem>
          <SettingLabel>
            <h4>Show Phone Number</h4>
            <p>Allow rescue organizations to see your phone number</p>
          </SettingLabel>
          <SettingControl>
            <Switch>
              <input
                type='checkbox'
                checked={settings.privacy.showPhone}
                onChange={() => handleToggle('privacy', 'showPhone')}
                disabled={isLoading}
              />
              <span />
            </Switch>
          </SettingControl>
        </SettingItem>
      </Section>

      <Section>
        <SectionTitle>Pet Preferences</SectionTitle>

        <SettingItem>
          <SettingLabel>
            <h4>Newsletter Subscription</h4>
            <p>Receive weekly updates about new pets and adoption stories</p>
          </SettingLabel>
          <SettingControl>
            <Switch>
              <input
                type='checkbox'
                checked={settings.preferences.newsletterOptIn}
                onChange={() => handleToggle('preferences', 'newsletterOptIn')}
                disabled={isLoading}
              />
              <span />
            </Switch>
          </SettingControl>
        </SettingItem>

        <SettingItem>
          <SettingLabel>
            <h4>Search Radius</h4>
            <p>Maximum distance to search for pets (miles)</p>
          </SettingLabel>
          <SettingControl>
            <Select
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
            </Select>
          </SettingControl>
        </SettingItem>
      </Section>

      {hasChanges && (
        <ButtonGroup>
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
        </ButtonGroup>
      )}

      <DangerZone>
        <h3>Danger Zone</h3>
        <p>
          Once you delete your account, there is no going back. This will permanently delete your
          profile, applications, and all associated data.
        </p>
        <Button variant='secondary' onClick={onDeleteAccount} disabled={isLoading}>
          Delete Account
        </Button>
      </DangerZone>
    </Form>
  );
};

export default SettingsForm;
