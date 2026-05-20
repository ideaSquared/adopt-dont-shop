import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
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
import clsx from 'clsx';
import { PageContainer, PageHeader, HeaderLeft } from '../components/ui';
import * as styles from './ReportViewPage.css';

/**
 * ADS-105: View page for a saved report.
 *
 * Renders the executed report, plus side-panel actions for editing,
 * deleting, scheduling email delivery, and creating shareable links.
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
  const { confirm, confirmProps } = useConfirm();

  if (!id) {
    return (
      <PageContainer>
        <Text>Missing report id.</Text>
      </PageContainer>
    );
  }
  if (reportQuery.isLoading || !reportQuery.data) {
    return (
      <PageContainer>
        <Text>Loading…</Text>
      </PageContainer>
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
      message: 'Delete this saved report? This action cannot be undone.',
      confirmText: 'Delete',
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
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const result = await tokenShareMutation.mutateAsync({ expiresAt: expires });
    const url = `${window.location.origin}/reports/shared/${result.token}`;
    setShareUrl(url);
  };

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>{reportQuery.data.name}</Heading>
          {reportQuery.data.description ? <Text>{reportQuery.data.description}</Text> : null}
        </HeaderLeft>
        <div className={styles.headerActions}>
          <Link to={`/reports/${id}/edit`}>
            <Button variant='outline'>Edit</Button>
          </Link>
          <Button variant='outline' onClick={() => setScheduleOpen(o => !o)}>
            Schedule
          </Button>
          <Button variant='outline' onClick={handleShare}>
            Share link
          </Button>
          <Button variant='outline' onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </PageHeader>

      {scheduleOpen ? (
        <div className={clsx(styles.panel, styles.schedulePanel)}>
          <Text>Schedule (cron + recipient)</Text>
          <div className={styles.scheduleRow}>
            <input
              type='text'
              value={cron}
              onChange={e => setCron(e.target.value)}
              placeholder='0 9 * * 1'
              className={styles.cronInput}
            />
            <input
              type='email'
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder='recipient@example.com'
              className={styles.emailInput}
            />
            <Button variant='primary' onClick={handleSchedule}>
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
        <Text>Running report…</Text>
      ) : executeQuery.isError ? (
        <Text>Failed to execute the report.</Text>
      ) : (
        <ReportRenderer
          config={reportQuery.data.config as never}
          data={dataMap}
          isLoading={executeQuery.isLoading}
          error={(executeQuery.error as Error | null) ?? null}
        />
      )}

      <ConfirmDialog {...confirmProps} />
    </PageContainer>
  );
};

export default ReportViewPage;
