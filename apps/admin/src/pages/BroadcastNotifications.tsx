import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CheckboxInput,
  ConfirmDialog,
  FormField,
  Heading,
  Input,
  PageHeader,
  SelectInput,
  Stack,
  TextArea,
  useConfirm,
} from '@adopt-dont-shop/lib.components';
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

const errorMessage = (error: Error, fallback: string): string => error.message || fallback;

const BroadcastNotifications: React.FC = () => {
  const [audience, setAudience] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { confirm, confirmProps } = useConfirm();

  const previewMutation = useMutation({
    mutationFn: (target: Parameters<typeof previewBroadcastAudience>[0]) =>
      previewBroadcastAudience(target),
  });
  const sendMutation = useMutation({
    mutationFn: (request: Parameters<typeof sendBroadcast>[0]) => sendBroadcast(request),
    onSuccess: broadcast => {
      setResult(broadcast);
      // Clear the composer on success so a stale title/body doesn't
      // re-fire on the next click. Channels and audience are preserved
      // because admins often send a series to the same cohort.
      setTitle('');
      setBody('');
    },
  });

  const previewing = previewMutation.isPending;
  const sending = sendMutation.isPending;
  const error = previewMutation.error
    ? errorMessage(previewMutation.error, 'Failed to preview audience')
    : sendMutation.error
      ? errorMessage(sendMutation.error, 'Failed to send broadcast')
      : null;

  const clearFieldError = (field: string) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const toggleChannel = (channel: string) => {
    setChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
    clearFieldError('channels');
  };

  const handleSend = (compose: z.infer<typeof BroadcastComposeSchema>) =>
    sendMutation.mutate({
      audience: compose.audience,
      title: compose.title,
      body: compose.body,
      channels: compose.channels,
      idempotencyKey: generateIdempotencyKey(),
    });

  const handlePreview = async () => {
    const parsed = BroadcastComposeSchema.safeParse({ audience, title, body, channels });
    if (!parsed.success) {
      setErrors(collectErrors(parsed.error));
      return;
    }
    setErrors({});
    sendMutation.reset();
    const count = await previewMutation.mutateAsync(parsed.data.audience).catch(() => null);
    if (count === null) {
      return;
    }
    const confirmed = await confirm({
      title: 'Confirm broadcast',
      message: `This will notify ${count.toLocaleString()} user${count === 1 ? '' : 's'} via ${channels.join(', ')}.`,
      confirmText: 'Send broadcast',
    });
    if (confirmed) {
      handleSend(parsed.data);
    }
  };

  return (
    <Stack spacing='lg'>
      <PageHeader
        title='Broadcast notifications'
        description='Send a system-wide notification to a coarse audience cohort. Per-user notification preferences and Do Not Disturb are respected for email, push, and SMS — in-app is always recorded.'
      />

      <Card>
        <CardHeader>
          <Heading level='h2' size='lg' noMargin>
            Compose broadcast
          </Heading>
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
                {previewing ? 'Checking audience…' : sending ? 'Sending…' : 'Preview & send'}
              </Button>
            </div>

            {result && (
              <Alert variant='success' title='Broadcast sent.'>
                Target: {result.targetCount}, in-app delivered: {result.deliveredInApp}, skipped by
                prefs: {result.skippedByPrefs}, skipped by DND: {result.skippedByDnd}.
              </Alert>
            )}

            {error && <Alert variant='error'>{error}</Alert>}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog {...confirmProps} />
    </Stack>
  );
};

export default BroadcastNotifications;
