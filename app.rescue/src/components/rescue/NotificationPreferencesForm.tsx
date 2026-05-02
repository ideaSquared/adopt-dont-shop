import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/libraryServices';
import * as styles from './NotificationPreferencesForm.css';

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
    return <div className={styles.loadingContainer}>Loading notification preferences...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Notification Channels</h3>
        <p className={styles.sectionDescription}>
          Choose which channels you want to receive notifications through.
        </p>

        <div className={styles.toggleRow}>
          <div className={styles.toggleLabel}>
            <span className={styles.toggleName}>Email Notifications</span>
            <span className={styles.toggleHint}>Receive notifications in your email inbox</span>
          </div>
          <button
            className={styles.toggle({ enabled: preferences.email })}
            onClick={() => togglePreference('email')}
            aria-label="Toggle email notifications"
            aria-pressed={preferences.email}
          />
        </div>

        <div className={styles.toggleRow}>
          <div className={styles.toggleLabel}>
            <span className={styles.toggleName}>Push Notifications</span>
            <span className={styles.toggleHint}>Receive in-browser push notifications</span>
          </div>
          <button
            className={styles.toggle({ enabled: preferences.push })}
            onClick={() => togglePreference('push')}
            aria-label="Toggle push notifications"
            aria-pressed={preferences.push}
          />
        </div>

        <div className={styles.toggleRow}>
          <div className={styles.toggleLabel}>
            <span className={styles.toggleName}>SMS Notifications</span>
            <span className={styles.toggleHint}>SMS notifications are not currently available</span>
          </div>
          <button
            className={styles.toggle({ enabled: preferences.sms, disabled: true })}
            onClick={() => undefined}
            aria-label="Toggle SMS notifications"
            aria-pressed={preferences.sms}
            aria-disabled="true"
          />
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Notification Categories</h3>
        <p className={styles.sectionDescription}>
          Select which types of events you want to be notified about.
        </p>

        <div className={styles.toggleRow}>
          <div className={styles.toggleLabel}>
            <span className={styles.toggleName}>Applications</span>
            <span className={styles.toggleHint}>New adoption applications and status changes</span>
          </div>
          <button
            className={styles.toggle({ enabled: preferences.applications })}
            onClick={() => togglePreference('applications')}
            aria-label="Toggle application notifications"
            aria-pressed={preferences.applications}
          />
        </div>

        <div className={styles.toggleRow}>
          <div className={styles.toggleLabel}>
            <span className={styles.toggleName}>Messages</span>
            <span className={styles.toggleHint}>Direct messages from adopters and staff</span>
          </div>
          <button
            className={styles.toggle({ enabled: preferences.messages })}
            onClick={() => togglePreference('messages')}
            aria-label="Toggle message notifications"
            aria-pressed={preferences.messages}
          />
        </div>

        <div className={styles.toggleRow}>
          <div className={styles.toggleLabel}>
            <span className={styles.toggleName}>System Updates</span>
            <span className={styles.toggleHint}>Platform updates and maintenance notices</span>
          </div>
          <button
            className={styles.toggle({ enabled: preferences.system })}
            onClick={() => togglePreference('system')}
            aria-label="Toggle system update notifications"
            aria-pressed={preferences.system}
          />
        </div>

        <div className={styles.toggleRow}>
          <div className={styles.toggleLabel}>
            <span className={styles.toggleName}>Marketing</span>
            <span className={styles.toggleHint}>Tips, feature announcements, and promotions</span>
          </div>
          <button
            className={styles.toggle({ enabled: preferences.marketing })}
            onClick={() => togglePreference('marketing')}
            aria-label="Toggle marketing notifications"
            aria-pressed={preferences.marketing}
          />
        </div>

        <div className={styles.toggleRow}>
          <div className={styles.toggleLabel}>
            <span className={styles.toggleName}>Reminders</span>
            <span className={styles.toggleHint}>Follow-up reminders for pending actions</span>
          </div>
          <button
            className={styles.toggle({ enabled: preferences.reminders })}
            onClick={() => togglePreference('reminders')}
            aria-label="Toggle reminder notifications"
            aria-pressed={preferences.reminders}
          />
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Delivery Frequency</h3>
        <p className={styles.sectionDescription}>
          Control how often you receive notification digests.
        </p>

        <div className={styles.frequencyOptions}>
          <button
            className={styles.frequencyOption({ selected: preferences.frequency === 'immediate' })}
            onClick={() => setFrequency('immediate')}
            aria-pressed={preferences.frequency === 'immediate'}
          >
            Immediate
          </button>
          <button
            className={styles.frequencyOption({ selected: preferences.frequency === 'daily' })}
            onClick={() => setFrequency('daily')}
            aria-pressed={preferences.frequency === 'daily'}
          >
            Daily Digest
          </button>
          <button
            className={styles.frequencyOption({ selected: preferences.frequency === 'weekly' })}
            onClick={() => setFrequency('weekly')}
            aria-pressed={preferences.frequency === 'weekly'}
          >
            Weekly Digest
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Quiet Hours</h3>
        <p className={styles.sectionDescription}>
          Pause notifications during a scheduled quiet period each day.
        </p>

        <div className={styles.quietHoursGrid}>
          <div>
            <label className={styles.fieldLabel} htmlFor="quiet-hours-start">
              Start time
            </label>
            <input
              className={styles.timeInput}
              id="quiet-hours-start"
              type="time"
              value={preferences.quietHoursStart}
              onChange={e => setQuietHoursField('quietHoursStart', e.target.value)}
              aria-label="Quiet hours start time"
            />
          </div>
          <div>
            <label className={styles.fieldLabel} htmlFor="quiet-hours-end">
              End time
            </label>
            <input
              className={styles.timeInput}
              id="quiet-hours-end"
              type="time"
              value={preferences.quietHoursEnd}
              onChange={e => setQuietHoursField('quietHoursEnd', e.target.value)}
              aria-label="Quiet hours end time"
            />
          </div>
        </div>

        <div>
          <label className={styles.fieldLabel} htmlFor="timezone">
            Timezone
          </label>
          <select
            className={styles.select}
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
          </select>
        </div>
      </div>

      <div className={styles.actionRow}>
        <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {success && (
          <p className={styles.successMessage} role="status">
            Preferences saved successfully.
          </p>
        )}
        {error !== null && !success && (
          <p className={styles.errorMessage} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferencesForm;
