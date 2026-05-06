import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Heading,
  ReportBuilder,
  Text,
  type ReportBuilderConfig,
} from '@adopt-dont-shop/lib.components';
import {
  useExecuteReportPreview,
  useReport,
  useReportTemplates,
  useSaveReport,
  useUpdateReport,
  type ReportConfig,
} from '@adopt-dont-shop/lib.analytics';
import { PageContainer, PageHeader, HeaderLeft } from '../components/ui';

/**
 * ADS-105: Custom report builder page.
 *
 * Three modes:
 *   /reports/new                       — blank report
 *   /reports/new?template={templateId} — pre-fill from template
 *   /reports/:id/edit                  — edit existing saved report
 *
 * Re-runs preview whenever the config changes (debounced via the
 * mutation's idle-state — caller submits explicitly via "Preview"
 * button to avoid hammering the API on every keystroke).
 */

const emptyConfig: ReportBuilderConfig = {
  filters: { groupBy: 'day' },
  layout: { columns: 2 },
  widgets: [],
};

const ReportBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');

  const reportQuery = useReport(id ?? null);
  const templatesQuery = useReportTemplates();
  const previewMutation = useExecuteReportPreview();
  const saveMutation = useSaveReport();
  const updateMutation = useUpdateReport(id ?? '');

  const [name, setName] = useState('Untitled report');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState<ReportBuilderConfig>(emptyConfig);
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});

  // Hydrate from existing saved report (edit mode).
  useEffect(() => {
    if (reportQuery.data) {
      setName(reportQuery.data.name);
      setDescription(reportQuery.data.description ?? '');
      setConfig(reportQuery.data.config as unknown as ReportBuilderConfig);
    }
  }, [reportQuery.data]);

  // Hydrate from template (new mode with ?template=).
  useEffect(() => {
    if (!id && templateId && templatesQuery.data) {
      const template = templatesQuery.data.find(t => t.template_id === templateId);
      if (template) {
        setName(`${template.name} (copy)`);
        setDescription(template.description ?? '');
        setConfig(template.config as unknown as ReportBuilderConfig);
      }
    }
  }, [id, templateId, templatesQuery.data]);

  const runPreview = async (): Promise<void> => {
    const data = await previewMutation.mutateAsync(config as unknown as ReportConfig);
    const map: Record<string, unknown> = {};
    for (const w of data.widgets) {
      map[w.id] = w.data;
    }
    setPreviewData(map);
  };

  const handleSave = async (): Promise<void> => {
    if (id) {
      await updateMutation.mutateAsync({
        name,
        description: description || null,
        config: config as unknown as ReportConfig,
      });
      navigate(`/reports/${id}`);
    } else {
      const created = await saveMutation.mutateAsync({
        name,
        description: description || undefined,
        config: config as unknown as ReportConfig,
      });
      navigate(`/reports/${created.saved_report_id}`);
    }
  };

  const isSaving = saveMutation.isLoading || updateMutation.isLoading;

  const previewError = useMemo(
    () => (previewMutation.error instanceof Error ? previewMutation.error : null),
    [previewMutation.error]
  );

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>{id ? 'Edit report' : 'New report'}</Heading>
          <Text>Build a custom analytics report. Click Preview to run it.</Text>
        </HeaderLeft>
        <button type='button' onClick={runPreview} disabled={config.widgets.length === 0}>
          {previewMutation.isLoading ? 'Running…' : 'Preview'}
        </button>
      </PageHeader>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <label>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Name</span>
          <input
            type='text'
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
        </label>
        <label>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Description (optional)</span>
          <input
            type='text'
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
        </label>
      </div>

      <ReportBuilder
        config={config}
        onChange={setConfig}
        previewData={previewData}
        isPreviewing={previewMutation.isLoading}
        previewError={previewError}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </PageContainer>
  );
};

export default ReportBuilderPage;
