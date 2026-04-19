import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { apiService } from '../../services/libraryServices';

type NotificationFrequency = 'immediate' | 'daily' | 'weekly';

type NotificationPreferencesData = {
  email: boolean;
  push: boolean;
  sms: boolean;
  applications: boolean;
  messages: boolean;
  system: boolean;
  marketing: boolean;
  reminders: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  frequency: NotificationFrequency;
};

type PreferencesApiResponse = {
  success: boolean;
  data: Omit<NotificationPreferencesData, 'frequency'> & {
    frequency?: NotificationFrequency;
  };
};

const DEFAULT_PREFERENCES: NotificationPreferencesData = {
  email: true,
  push: true,
  sms: false,
  applications: true,
  messages: true,
  system: true,
  marketing: false,
  reminders: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: 'UTC',
  frequency: 'immediate',
};

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Section = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
`;

const SectionDescription = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 1.25rem 0;
`;

const ToggleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
`;

const ToggleLabel = styled.div``;

const ToggleName = styled.span`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const ToggleHint = styled.span`
  display: block;
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.125rem;
`;

const Toggle = styled.button<{ $enabled: boolean; $disabled?: boolean }>`
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  border-radius: 9999px;
  border: none;
  cursor: ${props => (props.$disabled ? 'not-allowed' : 'pointer')};
  background-color: ${props => (props.$enabled ? '#3b82f6' : '#d1d5db')};
  opacity: ${props => (props.$disabled ? '0.5' : '1')};
  transition: background-color 0.2s;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 0.125rem;
    left: ${props => (props.$enabled ? '1.375rem' : '0.125rem')};
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: white;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
`;

const FrequencyOptions = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const FrequencyOption = styled.button<{ $selected: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 2px solid ${props => (props.$selected ? '#3b82f6' : '#e5e7eb')};
  background: ${props => (props.$selected ? '#eff6ff' : '#ffffff')};
  color: ${props => (props.$selected ? '#1d4ed8' : '#374151')};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
  }
`;

const QuietHoursGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.375rem;
`;

const TimeInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #111827;
  background: #ffffff;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #111827;
  background: #ffffff;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SaveButton = styled.button`
  padding: 0.625rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: #2563eb;
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

const SuccessMessage = styled.p`
  font-size: 0.875rem;
  color: #065f46;
  background: #d1fae5;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  margin: 0;
`;

const ErrorMessage = styled.p`
  font-size: 0.875rem;
  color: #991b1b;
  background: #fee2e2;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  margin: 0;
`;

const LoadingContainer = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
`;

type BooleanPreferenceKey = {
  [K in keyof NotificationPreferencesData]: NotificationPreferencesData[K] extends boolean
    ? K
    : never;
}[keyof NotificationPreferencesData];

const NotificationPreferencesForm: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferencesData>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.get<PreferencesApiResponse>(
          '/api/v1/notifications/preferences'
        );
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...response.data,
          frequency: response.data.frequency ?? 'immediate',
        });
      } catch {
        setError('Failed to load notification preferences. Using defaults.');
        setPreferences(DEFAULT_PREFERENCES);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const togglePreference = (key: BooleanPreferenceKey) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    setSuccess(false);
  };

  const setFrequency = (frequency: NotificationFrequency) => {
    setPreferences(prev => ({ ...prev, frequency }));
    setSuccess(false);
  };

  const setQuietHoursField = (
    field: 'quietHoursStart' | 'quietHoursEnd' | 'timezone',
    value: string
  ) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await apiService.put('/api/v1/notifications/preferences', preferences);
      setSuccess(true);
    } catch {
      setError('Failed to save notification preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingContainer>Loading notification preferences...</LoadingContainer>;
  }

  return (
    <Container>
      <Section>
        <SectionTitle>Notification Channels</SectionTitle>
        <SectionDescription>
          Choose which channels you want to receive notifications through.
        </SectionDescription>

        <ToggleRow>
          <ToggleLabel>
            <ToggleName>Email Notifications</ToggleName>
            <ToggleHint>Receive notifications in your email inbox</ToggleHint>
          </ToggleLabel>
          <Toggle
            $enabled={preferences.email}
            onClick={() => togglePreference('email')}
            aria-label="Toggle email notifications"
            aria-pressed={preferences.email}
          />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>
            <ToggleName>Push Notifications</ToggleName>
            <ToggleHint>Receive in-browser push notifications</ToggleHint>
          </ToggleLabel>
          <Toggle
            $enabled={preferences.push}
            onClick={() => togglePreference('push')}
            aria-label="Toggle push notifications"
            aria-pressed={preferences.push}
          />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>
            <ToggleName>SMS Notifications</ToggleName>
            <ToggleHint>SMS notifications are not currently available</ToggleHint>
          </ToggleLabel>
          <Toggle
            $enabled={preferences.sms}
            $disabled
            onClick={() => undefined}
            aria-label="Toggle SMS notifications"
            aria-pressed={preferences.sms}
            aria-disabled="true"
          />
        </ToggleRow>
      </Section>

      <Section>
        <SectionTitle>Notification Categories</SectionTitle>
        <SectionDescription>
          Select which types of events you want to be notified about.
        </SectionDescription>

        <ToggleRow>
          <ToggleLabel>
            <ToggleName>Applications</ToggleName>
            <ToggleHint>New adoption applications and status changes</ToggleHint>
          </ToggleLabel>
          <Toggle
            $enabled={preferences.applications}
            onClick={() => togglePreference('applications')}
            aria-label="Toggle application notifications"
            aria-pressed={preferences.applications}
          />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>
            <ToggleName>Messages</ToggleName>
            <ToggleHint>Direct messages from adopters and staff</ToggleHint>
          </ToggleLabel>
          <Toggle
            $enabled={preferences.messages}
            onClick={() => togglePreference('messages')}
            aria-label="Toggle message notifications"
            aria-pressed={preferences.messages}
          />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>
            <ToggleName>System Updates</ToggleName>
            <ToggleHint>Platform updates and maintenance notices</ToggleHint>
          </ToggleLabel>
          <Toggle
            $enabled={preferences.system}
            onClick={() => togglePreference('system')}
            aria-label="Toggle system update notifications"
            aria-pressed={preferences.system}
          />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>
            <ToggleName>Marketing</ToggleName>
            <ToggleHint>Tips, feature announcements, and promotions</ToggleHint>
          </ToggleLabel>
          <Toggle
            $enabled={preferences.marketing}
            onClick={() => togglePreference('marketing')}
            aria-label="Toggle marketing notifications"
            aria-pressed={preferences.marketing}
          />
        </ToggleRow>

        <ToggleRow>
          <ToggleLabel>
            <ToggleName>Reminders</ToggleName>
            <ToggleHint>Follow-up reminders for pending actions</ToggleHint>
          </ToggleLabel>
          <Toggle
            $enabled={preferences.reminders}
            onClick={() => togglePreference('reminders')}
            aria-label="Toggle reminder notifications"
            aria-pressed={preferences.reminders}
          />
        </ToggleRow>
      </Section>

      <Section>
        <SectionTitle>Delivery Frequency</SectionTitle>
        <SectionDescription>Control how often you receive notification digests.</SectionDescription>

        <FrequencyOptions>
          <FrequencyOption
            $selected={preferences.frequency === 'immediate'}
            onClick={() => setFrequency('immediate')}
            aria-pressed={preferences.frequency === 'immediate'}
          >
            Immediate
          </FrequencyOption>
          <FrequencyOption
            $selected={preferences.frequency === 'daily'}
            onClick={() => setFrequency('daily')}
            aria-pressed={preferences.frequency === 'daily'}
          >
            Daily Digest
          </FrequencyOption>
          <FrequencyOption
            $selected={preferences.frequency === 'weekly'}
            onClick={() => setFrequency('weekly')}
            aria-pressed={preferences.frequency === 'weekly'}
          >
            Weekly Digest
          </FrequencyOption>
        </FrequencyOptions>
      </Section>

      <Section>
        <SectionTitle>Quiet Hours</SectionTitle>
        <SectionDescription>
          Pause notifications during a scheduled quiet period each day.
        </SectionDescription>

        <QuietHoursGrid>
          <div>
            <FieldLabel htmlFor="quiet-hours-start">Start time</FieldLabel>
            <TimeInput
              id="quiet-hours-start"
              type="time"
              value={preferences.quietHoursStart}
              onChange={e => setQuietHoursField('quietHoursStart', e.target.value)}
              aria-label="Quiet hours start time"
            />
          </div>
          <div>
            <FieldLabel htmlFor="quiet-hours-end">End time</FieldLabel>
            <TimeInput
              id="quiet-hours-end"
              type="time"
              value={preferences.quietHoursEnd}
              onChange={e => setQuietHoursField('quietHoursEnd', e.target.value)}
              aria-label="Quiet hours end time"
            />
          </div>
        </QuietHoursGrid>

        <div>
          <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
          <Select
            id="timezone"
            value={preferences.timezone}
            onChange={e => setQuietHoursField('timezone', e.target.value)}
            aria-label="Timezone"
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
      </Section>

      <ActionRow>
        <SaveButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </SaveButton>
        {success && <SuccessMessage role="status">Preferences saved successfully.</SuccessMessage>}
        {error !== null && !success && <ErrorMessage role="alert">{error}</ErrorMessage>}
      </ActionRow>
    </Container>
  );
};

export default NotificationPreferencesForm;
