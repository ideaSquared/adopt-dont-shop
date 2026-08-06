import React, { useState } from 'react';
import { z } from 'zod';
import {
  Button,
  CheckboxInput,
  FormField,
  Heading,
  Input,
  SelectInput,
  Text,
  TextArea,
} from '@adopt-dont-shop/lib.components';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  HeaderLeft,
  PageContainer,
  PageHeader,
} from '../components/ui';
import {
  BroadcastChannel,
  BroadcastResult,
  previewBroadcastAudience,
  sendBroadcast,
} from '../services/broadcastService';
import * as styles from './BroadcastNotifications.css';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone (active users)' },
  { value: 'all-rescues', label: 'All rescue staff & volunteers' },
  { value: 'all-adopters', label: 'All adopters' },
  { value: 'all-staff', label: 'All platform staff' },
];

const CHANNEL_OPTIONS: { value: BroadcastChannel; label: string }[] = [
  { value: 'in_app', label: 'In-app' },
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push' },
  { value: 'sms', label: 'SMS' },
];

// B5: schema-first validation. A single Zod source of truth for the composer,
// mirroring (and narrowing) the service's BroadcastAudience / BroadcastChannel
// unions so the parsed payload is typed without assertions.
const BroadcastComposeSchema = z.object({
  audience: z.enum(['all', 'all-rescues', 'all-adopters', 'all-staff']),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  body: z
    .string()
    .trim()
    .min(1, 'Body is required')
    .max(2000, 'Body must be 2000 characters or less'),
  channels: z
    .array(z.enum(['in_app', 'email', 'push', 'sms']))
    .min(1, 'Select at least one channel'),
});

const collectErrors = (error: z.ZodError): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!(key in result)) {
      result[key] = issue.message;
    }
  }
  return result;
};

const singleValue = (value: string | string[]): string =>
  Array.isArray(value) ? (value[0] ?? '') : value;

const generateIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID — used by tests
  // and very old browsers. Random enough for an idempotency key; the
  // server also hashes it before storing.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const BroadcastNotifications: React.FC = () => {
  const [audience, setAudience] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const toggleChannel = (channel: string) => {
    setChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
    clearFieldError('channels');
  };

  const handlePreview = async () => {
    const parsed = BroadcastComposeSchema.safeParse({ audience, title, body, channels });
    if (!parsed.success) {
      setErrors(collectErrors(parsed.error));
      return;
    }
    setErrors({});
    setPreviewing(true);
    setError(null);
    try {
      const count = await previewBroadcastAudience(parsed.data.audience);
      setPreviewCount(count);
      setConfirming(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview audience');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    const parsed = BroadcastComposeSchema.safeParse({ audience, title, body, channels });
    if (!parsed.success) {
      setErrors(collectErrors(parsed.error));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const broadcast = await sendBroadcast({
        audience: parsed.data.audience,
        title: parsed.data.title,
        body: parsed.data.body,
        channels: parsed.data.channels,
        idempotencyKey: generateIdempotencyKey(),
      });
      setResult(broadcast);
      setConfirming(false);
      // Clear the composer on success so a stale title/body doesn't
      // re-fire on the next click. Channels and audience are preserved
      // because admins often send a series to the same cohort.
      setTitle('');
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Broadcast notifications</Heading>
          <Text>
            Send a system-wide notification to a coarse audience cohort. Per-user notification
            preferences and Do Not Disturb are respected for email, push, and SMS — in-app is always
            recorded.
          </Text>
        </HeaderLeft>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Compose broadcast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.form}>
            <SelectInput
              label='Audience'
              value={audience}
              onChange={value => {
                setAudience(singleValue(value));
                clearFieldError('audience');
              }}
              options={AUDIENCE_OPTIONS}
              error={errors.audience}
              fullWidth
            />

            <FormField label='Title' htmlFor='broadcast-title' required error={errors.title}>
              <Input
                id='broadcast-title'
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  clearFieldError('title');
                }}
                maxLength={200}
                aria-invalid={!!errors.title}
              />
            </FormField>

            <FormField label='Body' htmlFor='broadcast-body' required error={errors.body}>
              <TextArea
                id='broadcast-body'
                value={body}
                onChange={e => {
                  setBody(e.target.value);
                  clearFieldError('body');
                }}
                maxLength={2000}
                rows={6}
                aria-invalid={!!errors.body}
              />
            </FormField>

            <FormField label='Channels' error={errors.channels}>
              <div className={styles.channelsRow}>
                {CHANNEL_OPTIONS.map(option => (
                  <CheckboxInput
                    key={option.value}
                    label={option.label}
                    checked={channels.includes(option.value)}
                    onChange={() => toggleChannel(option.value)}
                  />
                ))}
              </div>
            </FormField>

            <div className={styles.actions}>
              <Button variant='primary' onClick={handlePreview} disabled={previewing || sending}>
                {previewing ? 'Checking audience…' : 'Preview & send'}
              </Button>
            </div>

            {confirming && previewCount !== null && (
              <div className={styles.result}>
                <strong>Confirm broadcast</strong>
                <div>
                  This will notify {previewCount.toLocaleString()} user
                  {previewCount === 1 ? '' : 's'} via {channels.join(', ')}.
                </div>
                <div className={styles.actions}>
                  <Button variant='primary' onClick={handleSend} disabled={sending}>
                    {sending ? 'Sending…' : 'Send broadcast'}
                  </Button>
                  <Button
                    variant='secondary'
                    onClick={() => setConfirming(false)}
                    disabled={sending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {result && (
              <div className={styles.result}>
                <strong>Broadcast sent.</strong>
                <div>
                  Target: {result.targetCount}, in-app delivered: {result.deliveredInApp}, skipped
                  by prefs: {result.skippedByPrefs}, skipped by DND: {result.skippedByDnd}.
                </div>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default BroadcastNotifications;
