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
import * as styles from './ReportBuilderPage.css';

/**
 * ADS-105: Custom report builder for rescue staff.
 *
 * Same shape as the admin builder; backend forces the report's
 * rescueId to the staff member's rescue when none is supplied.
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

  useEffect(() => {
    if (reportQuery.data) {
      setName(reportQuery.data.name);
      setDescription(reportQuery.data.description ?? '');
      setConfig(reportQuery.data.config as unknown as ReportBuilderConfig);
    }
  }, [reportQuery.data]);

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

  const isSaving = saveMutation.isPending || updateMutation.isPending;
  const previewError = useMemo(
    () => (previewMutation.error as Error | null) ?? null,
    [previewMutation.error]
  );

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <Heading level="h1">{id ? 'Edit report' : 'New report'}</Heading>
          <Text>Build a custom report. Click Preview to run it.</Text>
        </div>
        <button type="button" onClick={runPreview} disabled={config.widgets.length === 0}>
          {previewMutation.isPending ? 'Running…' : 'Preview'}
        </button>
      </div>

      <div className={styles.formGrid}>
        <label>
          <span className={styles.fieldLabel}>Name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={styles.textInput}
          />
        </label>
        <label>
          <span className={styles.fieldLabel}>Description</span>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={styles.textInput}
          />
        </label>
      </div>

      <ReportBuilder
        config={config}
        onChange={setConfig}
        previewData={previewData}
        isPreviewing={previewMutation.isPending}
        previewError={previewError}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
};

export default ReportBuilderPage;
