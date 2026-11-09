import React, { useState } from 'react';
import {
  Alert,
  Button,
  CheckboxInput,
  FormField,
  FormSection,
  Input,
  SelectInput,
  type SelectOption,
} from '@adopt-dont-shop/lib.components';
import { z } from 'zod';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../hooks/use-notification-preferences';
import {
  DIGEST_FREQUENCIES,
  type DigestFrequency,
  type NotificationPreferences,
} from '../services/notification-preferences-service';
import * as styles from './NotificationPreferencesForm.css';

type FlagKey = {
  [K in keyof NotificationPreferences]: NotificationPreferences[K] extends boolean ? K : never;
}[keyof NotificationPreferences];

type FlagField = { key: FlagKey; label: string; description: string };

const CHANNELS: ReadonlyArray<FlagField> = [
  { key: 'emailEnabled', label: 'Email', description: 'Send notifications to your inbox' },
  { key: 'pushEnabled', label: 'Push', description: 'Show notifications in your browser' },
];

const CATEGORIES: ReadonlyArray<FlagField> = [
  {
    key: 'applicationUpdates',
    label: 'Application updates',
    description: 'New adoption applications and status changes',
  },
  { key: 'petMatches', label: 'Pet matches', description: 'Pets that match your preferences' },
  {
    key: 'rescueUpdates',
    label: 'Rescue updates',
    description: 'News from rescues you follow or work with',
  },
  { key: 'chatMessages', label: 'Messages', description: 'New chat messages' },
];

const FREQUENCY_LABELS: Record<DigestFrequency, string> = {
  immediate: 'Immediately',
  daily: 'Daily digest',
  weekly: 'Weekly digest',
  never: 'Never',
};

const FREQUENCY_OPTIONS: SelectOption[] = DIGEST_FREQUENCIES.map(value => ({
  value,
  label: FREQUENCY_LABELS[value],
}));

const TIMEZONE_OPTIONS: ReadonlyArray<SelectOption> = [
  { value: 'Europe/London', label: 'UK time (Europe/London)' },
  { value: 'UTC', label: 'UTC' },
];

// A timezone saved elsewhere (older forms offered US zones) stays selectable.
const timezoneOptions = (current: string): SelectOption[] =>
  TIMEZONE_OPTIONS.some(option => option.value === current)
    ? [...TIMEZONE_OPTIONS]
    : [...TIMEZONE_OPTIONS, { value: current, label: current }];

const QuietHoursSchema = z
  .object({ quietHoursStart: z.string(), quietHoursEnd: z.string() })
  .refine(({ quietHoursStart, quietHoursEnd }) => !quietHoursStart === !quietHoursEnd, {
    message: 'Set both a start and end time, or leave both empty.',
  });

// SelectInput yields `string | string[]`; every select here is single-value.
const singleValue = (value: string | string[]): string =>
  Array.isArray(value) ? (value[0] ?? '') : value;

const isDigestFrequency = (value: string): value is DigestFrequency =>
  DIGEST_FREQUENCIES.some(frequency => frequency === value);

type EditorProps = { saved: NotificationPreferences };

const PreferencesEditor = ({ saved }: EditorProps) => {
  // Only the user's edits are held locally, layered over the latest server
  // copy: a background refetch replacing stale cached data shows through for
  // every field the user hasn't touched.
  const [edits, setEdits] = useState<Partial<NotificationPreferences>>({});
  const [quietHoursError, setQuietHoursError] = useState<string | undefined>();
  const update = useUpdateNotificationPreferences();
  const draft: NotificationPreferences = { ...saved, ...edits };

  const change = (patch: Partial<NotificationPreferences>) => {
    setEdits(prev => ({ ...prev, ...patch }));
    // Clear the saved/error message, but never while a save is in flight:
    // reset() doesn't cancel the request and would re-enable Save, letting an
    // older request land last and overwrite a newer one.
    if (!update.isPending) {
      update.reset();
    }
  };

  const changeQuietHours = (patch: Partial<NotificationPreferences>) => {
    change(patch);
    setQuietHoursError(undefined);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = QuietHoursSchema.safeParse(draft);
    if (!parsed.success) {
      setQuietHoursError(parsed.error.issues[0]?.message);
      return;
    }
    // ADS-1325: the backend rejects any save that enables SMS, so a legacy
    // row with SMS on would otherwise block every save.
    update.mutate({ ...draft, smsEnabled: false }, { onSuccess: () => setEdits({}) });
  };

  // The error belongs to whichever time is missing.
  const startError = draft.quietHoursStart ? undefined : quietHoursError;
  const endError = draft.quietHoursStart ? quietHoursError : undefined;

  const renderFlag = ({ key, label, description }: FlagField) => (
    <CheckboxInput
      key={key}
      label={label}
      description={description}
      checked={draft[key]}
      onChange={() => change({ [key]: !draft[key] })}
    />
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormSection title='Channels' description='How we reach you.'>
        <div className={styles.fieldStack}>
          {CHANNELS.map(renderFlag)}
          {/* ADS-1325: SMS has no provider behind it and the backend rejects
              enabling it. Shown disabled, with the reason, rather than hidden. */}
          <CheckboxInput
            label='SMS'
            description='SMS notifications are not available yet'
            checked={false}
            disabled
          />
        </div>
      </FormSection>

      <FormSection title='What to notify me about'>
        <div className={styles.fieldStack}>{CATEGORIES.map(renderFlag)}</div>
      </FormSection>

      <FormSection title='Email digest' description='Group email notifications into a summary.'>
        <SelectInput
          label='Digest frequency'
          data-testid='notification-digest-frequency'
          value={draft.digestFrequency}
          options={FREQUENCY_OPTIONS}
          onChange={value => {
            const next = singleValue(value);
            if (isDigestFrequency(next)) {
              change({ digestFrequency: next });
            }
          }}
          fullWidth
        />
      </FormSection>

      <FormSection
        title='Quiet hours'
        description='Pause push and email notifications overnight. Leave both empty to turn quiet hours off.'
      >
        <div className={styles.quietHoursGrid}>
          <FormField label='Quiet hours start' htmlFor='quiet-hours-start' error={startError}>
            <Input
              id='quiet-hours-start'
              type='time'
              value={draft.quietHoursStart}
              onChange={e => changeQuietHours({ quietHoursStart: e.target.value })}
            />
          </FormField>
          <FormField label='Quiet hours end' htmlFor='quiet-hours-end' error={endError}>
            <Input
              id='quiet-hours-end'
              type='time'
              value={draft.quietHoursEnd}
              onChange={e => changeQuietHours({ quietHoursEnd: e.target.value })}
            />
          </FormField>
        </div>
        <SelectInput
          label='Timezone'
          data-testid='notification-timezone'
          value={draft.timezone}
          options={timezoneOptions(saved.timezone)}
          onChange={value => change({ timezone: singleValue(value) })}
          fullWidth
        />
      </FormSection>

      <div className={styles.actions}>
        <Button type='submit' isLoading={update.isPending} disabled={update.isPending}>
          Save notification preferences
        </Button>
        {update.isSuccess && (
          <p className={styles.savedMessage} role='status'>
            Notification preferences saved.
          </p>
        )}
      </div>
      {update.isError && (
        <Alert variant='error'>
          We could not save your notification preferences. Please try again.
        </Alert>
      )}
    </form>
  );
};

/**
 * The signed-in user's notification preferences: channels, categories, email
 * digest, and quiet hours. Needs a QueryClientProvider above it.
 */
export const NotificationPreferencesForm = () => {
  const { data, isPending, isError } = useNotificationPreferences();

  if (isPending) {
    return (
      <p className={styles.loading} role='status'>
        Loading notification preferences…
      </p>
    );
  }

  if (isError) {
    return (
      <Alert variant='error'>
        We could not load your notification preferences. Please refresh the page to try again.
      </Alert>
    );
  }

  return <PreferencesEditor saved={data} />;
};
