import React, { useState } from 'react';
import {
  Alert,
  Heading,
  Text,
  FormField,
  Input,
  Button,
  ConfirmDialog,
  PageHeader,
  useConfirm,
  toast,
} from '@adopt-dont-shop/lib.components';
import { Download, TriangleAlert } from 'lucide-react';
import { apiService } from '../services/libraryServices';
import * as styles from './PrivacyTools.css';

const PrivacyTools: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const { confirm, confirmProps } = useConfirm();

  const handleExport = async () => {
    if (!userId.trim()) {
      setMessage({ kind: 'error', text: 'Enter a user ID' });
      return;
    }
    setBusy('export');
    setMessage(null);
    try {
      const bundle = await apiService.get<unknown>(
        `/api/v1/privacy/admin/users/${encodeURIComponent(userId.trim())}/export`
      );
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-export-${userId.trim()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ kind: 'success', text: 'Export downloaded.' });
      toast.success('User data exported');
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Export failed',
      });
      toast.error('Failed to export user data');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!userId.trim()) {
      setMessage({ kind: 'error', text: 'Enter a user ID' });
      return;
    }
    const confirmed = await confirm({
      title: 'Schedule account deletion?',
      message: `Schedule account deletion for ${userId.trim()}? Data will be anonymised after the 30-day grace window.`,
      confirmText: 'Schedule deletion',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    setBusy('delete');
    setMessage(null);
    try {
      await apiService.post(
        `/api/v1/privacy/admin/users/${encodeURIComponent(userId.trim())}/delete-request`,
        { reason: reason.trim() || undefined }
      );
      setMessage({
        kind: 'success',
        text: 'Deletion scheduled. Hard anonymisation runs after the 30-day grace window.',
      });
      toast.success('Account deletion scheduled');
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Deletion request failed',
      });
      toast.error('Failed to schedule account deletion');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title='Privacy Tools'
        description='GDPR / CCPA admin tooling: trigger data exports or deletion requests on behalf of users.'
      />

      <FormField label='User ID' htmlFor='privacy-user-id'>
        <Input
          id='privacy-user-id'
          type='text'
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder='UUID of the target user'
        />
      </FormField>

      <section className={styles.section}>
        <Heading level='h2'>Data Export (GDPR Art. 20)</Heading>
        <Text>Downloads a JSON archive of user-owned data.</Text>
        <Button variant='primary' onClick={handleExport} disabled={busy !== null}>
          <Download size='1em' className={styles.buttonIcon} />
          {busy === 'export' ? 'Exporting…' : 'Export user data'}
        </Button>
      </section>

      <section className={styles.section}>
        <Heading level='h2'>Account Deletion (GDPR Art. 17)</Heading>
        <Text>
          Schedules account deletion with a 30-day grace window. Data is hard-anonymised after the
          grace period.
        </Text>
        <div className={styles.fieldGroupSpaced}>
          <FormField label='Reason (optional, internal audit log)' htmlFor='privacy-reason'>
            <Input
              id='privacy-reason'
              type='text'
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder='Subject access request received via support'
            />
          </FormField>
        </div>
        <Button
          variant='outline'
          onClick={handleDelete}
          disabled={busy !== null}
          className={styles.deleteButton}
        >
          <TriangleAlert size='1em' className={styles.buttonIcon} />
          {busy === 'delete' ? 'Scheduling…' : 'Schedule deletion'}
        </Button>
      </section>

      {message && (
        <Alert variant={message.kind === 'success' ? 'success' : 'error'}>{message.text}</Alert>
      )}

      <ConfirmDialog {...confirmProps} />
    </div>
  );
};

export default PrivacyTools;
