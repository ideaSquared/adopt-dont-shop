import React, { useState } from 'react';
import clsx from 'clsx';
import { Heading, Text, Input, Button } from '@adopt-dont-shop/lib.components';
import { FiDownload, FiAlertTriangle } from 'react-icons/fi';
import { apiService } from '../services/libraryServices';
import * as styles from './PrivacyTools.css';

const PrivacyTools: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

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
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Export failed',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!userId.trim()) {
      setMessage({ kind: 'error', text: 'Enter a user ID' });
      return;
    }
    if (
      !window.confirm(
        `Schedule account deletion for ${userId.trim()}? Data will be anonymised after the 30-day grace window.`
      )
    ) {
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
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Deletion request failed',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.container}>
      <div>
        <Heading level='h1'>Privacy Tools</Heading>
        <Text>
          GDPR / CCPA admin tooling: trigger data exports or deletion requests on behalf of users.
        </Text>
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor='privacy-user-id'>User ID</label>
        <Input
          id='privacy-user-id'
          type='text'
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder='UUID of the target user'
        />
      </div>

      <section className={styles.section}>
        <Heading level='h2'>Data Export (GDPR Art. 20)</Heading>
        <Text>Downloads a JSON archive of user-owned data.</Text>
        <Button variant='primary' onClick={handleExport} disabled={busy !== null}>
          <FiDownload className={styles.buttonIcon} />
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
          <label htmlFor='privacy-reason'>Reason (optional, internal audit log)</label>
          <Input
            id='privacy-reason'
            type='text'
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder='Subject access request received via support'
          />
        </div>
        <Button
          variant='outline'
          onClick={handleDelete}
          disabled={busy !== null}
          className={styles.deleteButton}
        >
          <FiAlertTriangle className={styles.buttonIcon} />
          {busy === 'delete' ? 'Scheduling…' : 'Schedule deletion'}
        </Button>
      </section>

      {message && (
        <div
          className={clsx(
            styles.message,
            message.kind === 'success' ? styles.messageSuccess : styles.messageError
          )}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};

export default PrivacyTools;
