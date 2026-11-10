import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  FormField,
  Input,
  PageHeader,
  ReportRenderer,
  Spinner,
  Stack,
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
    return <ErrorState title='Missing report id.' />;
  }
  if (reportQuery.isLoading || !reportQuery.data) {
    return <Spinner />;
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
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    try {
      const result = await tokenShareMutation.mutateAsync({ expiresAt: expires });
      const url = `${window.location.origin}/reports/shared/${result.token}`;
      setShareUrl(url);
      toast.success('Share link created');
    } catch {
      toast.error('Failed to create share link');
    }
  };

  return (
    <Stack spacing='lg'>
      <PageHeader
        title={reportQuery.data.name}
        description={reportQuery.data.description ?? undefined}
        actions={
          <Stack direction='horizontal' spacing='sm' wrap>
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
          </Stack>
        }
      />

      {scheduleOpen ? (
        <Card variant='filled' padding='sm'>
          <Stack spacing='sm'>
            <FormField label='Schedule (cron)' htmlFor='report-schedule-cron'>
              <Input
                id='report-schedule-cron'
                type='text'
                value={cron}
                onChange={e => setCron(e.target.value)}
                placeholder='0 9 * * 1'
              />
            </FormField>
            <FormField label='Recipient email' htmlFor='report-schedule-recipient'>
              <Input
                id='report-schedule-recipient'
                type='email'
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder='recipient@example.com'
              />
            </FormField>
            <div>
              <Button variant='primary' onClick={handleSchedule}>
                Save schedule
              </Button>
            </div>
          </Stack>
        </Card>
      ) : null}

      {shareUrl ? (
        <Alert variant='success'>
          Share link (expires in 7 days): <code className={styles.shareCode}>{shareUrl}</code>
        </Alert>
      ) : null}

      {executeQuery.isLoading ? (
        <Spinner />
      ) : executeQuery.isError ? (
        <ErrorState message='Failed to execute the report.' />
      ) : (
        <ReportRenderer
          config={reportQuery.data.config as never}
          data={dataMap}
          isLoading={executeQuery.isLoading}
          error={(executeQuery.error as Error | null) ?? null}
        />
      )}

      <ConfirmDialog {...confirmProps} />
    </Stack>
  );
};

export default ReportViewPage;
