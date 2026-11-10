import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  Button,
  Card,
  FormField,
  FormRow,
  Input,
  PageHeader,
  ReportBuilder,
  Stack,
  toast,
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
    try {
      if (id) {
        await updateMutation.mutateAsync({
          name,
          description: description || null,
          config: config as unknown as ReportConfig,
        });
        toast.success('Report saved');
        navigate(`/reports/${id}`);
      } else {
        const created = await saveMutation.mutateAsync({
          name,
          description: description || undefined,
          config: config as unknown as ReportConfig,
        });
        toast.success('Report created');
        navigate(`/reports/${created.saved_report_id}`);
      }
    } catch {
      toast.error('Failed to save report');
    }
  };

  const isSaving = saveMutation.isPending || updateMutation.isPending;

  const previewError = useMemo(
    () => (previewMutation.error as Error | null) ?? null,
    [previewMutation.error]
  );

  return (
    <Stack spacing='lg'>
      <PageHeader
        title={id ? 'Edit report' : 'New report'}
        description='Build a custom analytics report. Click Preview to run it.'
        actions={
          <Button variant='outline' onClick={runPreview} disabled={config.widgets.length === 0}>
            {previewMutation.isPending ? 'Running…' : 'Preview'}
          </Button>
        }
      />

      <Card variant='filled' padding='sm'>
        <FormRow columns='two'>
          <FormField label='Name' htmlFor='report-name'>
            <Input
              id='report-name'
              type='text'
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </FormField>
          <FormField label='Description (optional)' htmlFor='report-description'>
            <Input
              id='report-description'
              type='text'
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </FormField>
        </FormRow>
      </Card>

      <ReportBuilder
        config={config}
        onChange={setConfig}
        previewData={previewData}
        isPreviewing={previewMutation.isPending}
        previewError={previewError}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </Stack>
  );
};

export default ReportBuilderPage;
