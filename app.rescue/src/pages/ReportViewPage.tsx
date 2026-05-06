import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heading, ReportRenderer, Text } from '@adopt-dont-shop/lib.components';
import {
  useDeleteReport,
  useExecuteSavedReport,
  useReport,
  useUpsertSchedule,
  useCreateTokenShare,
} from '@adopt-dont-shop/lib.analytics';

/**
 * ADS-105: Rescue report viewer with schedule + share actions.
 */

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
};

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

  if (!id) {
    return (
      <div style={containerStyle}>
        <Text>Missing report id.</Text>
      </div>
    );
  }
  if (reportQuery.isLoading || !reportQuery.data) {
    return (
      <div style={containerStyle}>
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
    if (!confirm('Delete this report?')) {
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
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Heading level="h1">{reportQuery.data.name}</Heading>
          {reportQuery.data.description ? <Text>{reportQuery.data.description}</Text> : null}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
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
        <div
          style={{
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#f9fafb',
          }}
        >
          <Text>Schedule (cron + recipient email)</Text>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="text"
              value={cron}
              onChange={e => setCron(e.target.value)}
              style={{ padding: '6px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            />
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
              style={{
                flex: 1,
                padding: '6px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
            />
            <button type="button" onClick={handleSchedule}>
              Save schedule
            </button>
          </div>
        </div>
      ) : null}

      {shareUrl ? (
        <div
          style={{
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#ecfdf5',
          }}
        >
          <Text>Share link (expires in 7 days):</Text>
          <code style={{ wordBreak: 'break-all' }}>{shareUrl}</code>
        </div>
      ) : null}

      {executeQuery.isLoading ? (
        <Text>Running report…</Text>
      ) : (
        <ReportRenderer
          config={reportQuery.data.config as never}
          data={dataMap}
          isLoading={executeQuery.isLoading}
          error={executeQuery.error instanceof Error ? executeQuery.error : null}
        />
      )}
    </div>
  );
};

export default ReportViewPage;
