import React, { useState } from 'react';
import {
  Button,
  Heading,
  SelectInput,
  Text,
  TextArea,
  TextInput,
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
  BroadcastAudience,
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
  const [audience, setAudience] = useState<BroadcastAudience>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState<BroadcastChannel[]>(['in_app']);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleChannel = (channel: BroadcastChannel) => {
    setChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0 && channels.length > 0;

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);
    try {
      const count = await previewBroadcastAudience(audience);
      setPreviewCount(count);
      setConfirming(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview audience');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const broadcast = await sendBroadcast({
        audience,
        title,
        body,
        channels,
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
              onChange={(value: string | string[]) => setAudience(value as BroadcastAudience)}
              options={AUDIENCE_OPTIONS}
            />

            <TextInput
              label='Title'
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              required
              fullWidth
            />

            <TextArea
              label='Body'
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={2000}
              rows={6}
              required
            />

            <div>
              <Text>Channels</Text>
              <div className={styles.channelsRow}>
                {CHANNEL_OPTIONS.map(option => (
                  <label key={option.value} className={styles.channelLabel}>
                    <input
                      type='checkbox'
                      checked={channels.includes(option.value)}
                      onChange={() => toggleChannel(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                variant='primary'
                onClick={handlePreview}
                disabled={!canSend || previewing || sending}
              >
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
