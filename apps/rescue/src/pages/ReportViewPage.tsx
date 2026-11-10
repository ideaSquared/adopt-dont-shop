import React, { useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Button,
  ConfirmDialog,
  ErrorState,
  FormField,
  Input,
  PageHeader,
  ReportRenderer,
  Spinner,
  Text,
  toast,
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
        <Spinner label="Loading…" />
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
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Report deleted');
      navigate('/reports');
    } catch {
      toast.error('Failed to delete report');
    }
  };

  const handleSchedule = async (): Promise<void> => {
    if (!recipientEmail) {
      return;
    }
    try {
      await scheduleMutation.mutateAsync({
        cron,
        recipients: [{ email: recipientEmail }],
        format: 'pdf',
        isEnabled: true,
      });
      toast.success('Schedule saved');
      setScheduleOpen(false);
    } catch {
      toast.error('Failed to save schedule');
    }
  };

  const handleShare = async (): Promise<void> => {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      const result = await tokenShareMutation.mutateAsync({ expiresAt: expires });
      setShareUrl(`${window.location.origin}/reports/shared/${result.token}`);
      toast.success('Share link created');
    } catch {
      toast.error('Failed to create share link');
    }
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title={reportQuery.data.name}
        description={reportQuery.data.description ?? undefined}
        actions={
          <div className={styles.headerActions}>
            <Link to={`/reports/${id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
            <Button variant="outline" onClick={() => setScheduleOpen(o => !o)}>
              Schedule
            </Button>
            <Button variant="outline" onClick={handleShare}>
              Share link
            </Button>
            <Button variant="outline" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      />

      {scheduleOpen ? (
        <div className={clsx(styles.panel, styles.schedulePanel)}>
          <Text>Schedule (cron + recipient email)</Text>
          <div className={styles.scheduleRow}>
            <FormField label="Cron schedule" htmlFor="schedule-cron" className={styles.cronInput}>
              <Input
                id="schedule-cron"
                type="text"
                value={cron}
                onChange={e => setCron(e.target.value)}
              />
            </FormField>
            <FormField
              label="Recipient email"
              htmlFor="schedule-recipient"
              className={styles.emailInput}
            >
              <Input
                id="schedule-recipient"
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
              />
            </FormField>
            <Button variant="primary" onClick={handleSchedule}>
              Save schedule
            </Button>
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
        <Spinner label="Running report…" />
      ) : executeQuery.isError ? (
        <ErrorState message="Failed to execute the report." />
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
