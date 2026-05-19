import React, { useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ConfirmDialog,
  Heading,
  ReportRenderer,
  Text,
  useConfirm,
} from '@adopt-dont-shop/lib.components';
import {
  useDeleteReport,
  useExecuteSavedReport,
  useReport,
  useUpsertSchedule,
  useCreateTokenShare,
} from '@adopt-dont-shop/lib.analytics';
import * as styles from './ReportViewPage.css';

/**
 * ADS-105: Rescue report viewer with schedule + share actions.
 */

const ReportViewPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reportQuery = useReport(id ?? null);
  const executeQuery = useExecuteSavedReport(id ?? null);
  const deleteMutation = useDeleteReport();
  const scheduleMutation = useUpsertSchedule(id ?? '');
  const tokenShareMutation = useCreateTokenShare(id ?? '');

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [cron, setCron] = useState('0 9 * * 1');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  // ADS-586: confirm dialog for destructive report deletion.
  const { confirm, confirmProps } = useConfirm();

  if (!id) {
    return (
      <div className={styles.container}>
        <Text>Missing report id.</Text>
      </div>
    );
  }
  if (reportQuery.isLoading || !reportQuery.data) {
    return (
      <div className={styles.container}>
        <Text>Loading…</Text>
      </div>
    );
  }

  const dataMap: Record<string, unknown> = {};
  if (executeQuery.data) {
    for (const w of executeQuery.data.widgets) {
      dataMap[w.id] = w.data;
    }
  }

  const handleDelete = async (): Promise<void> => {
    const confirmed = await confirm({
      title: 'Delete report?',
      message: 'Delete this report? This action cannot be undone.',
      confirmText: 'Delete report',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    await deleteMutation.mutateAsync(id);
    navigate('/reports');
  };

  const handleSchedule = async (): Promise<void> => {
    if (!recipientEmail) {
      return;
    }
    await scheduleMutation.mutateAsync({
      cron,
      recipients: [{ email: recipientEmail }],
      format: 'pdf',
      isEnabled: true,
    });
    setScheduleOpen(false);
  };

  const handleShare = async (): Promise<void> => {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const result = await tokenShareMutation.mutateAsync({ expiresAt: expires });
    setShareUrl(`${window.location.origin}/reports/shared/${result.token}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <Heading level="h1">{reportQuery.data.name}</Heading>
          {reportQuery.data.description ? <Text>{reportQuery.data.description}</Text> : null}
        </div>
        <div className={styles.headerActions}>
          <Link to={`/reports/${id}/edit`}>
            <button type="button">Edit</button>
          </Link>
          <button type="button" onClick={() => setScheduleOpen(o => !o)}>
            Schedule
          </button>
          <button type="button" onClick={handleShare}>
            Share link
          </button>
          <button type="button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {scheduleOpen ? (
        <div className={clsx(styles.panel, styles.schedulePanel)}>
          <Text>Schedule (cron + recipient email)</Text>
          <div className={styles.scheduleRow}>
            <input
              type="text"
              value={cron}
              onChange={e => setCron(e.target.value)}
              className={styles.cronInput}
            />
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
              className={styles.emailInput}
            />
            <button type="button" onClick={handleSchedule}>
              Save schedule
            </button>
          </div>
        </div>
      ) : null}

      {shareUrl ? (
        <div className={clsx(styles.panel, styles.sharePanel)}>
          <Text>Share link (expires in 7 days):</Text>
          <code className={styles.shareCode}>{shareUrl}</code>
        </div>
      ) : null}

      {executeQuery.isLoading ? (
        <Text>Running report…</Text>
      ) : (
        <ReportRenderer
          config={reportQuery.data.config as never}
          data={dataMap}
          isLoading={executeQuery.isLoading}
          error={(executeQuery.error as Error | null) ?? null}
        />
      )}

      <ConfirmDialog {...confirmProps} />
    </div>
  );
};

export default ReportViewPage;
