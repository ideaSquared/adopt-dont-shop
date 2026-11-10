import React from 'react';
import { Link } from 'react-router';
import {
  Button,
  EmptyState,
  ErrorState,
  Heading,
  PageHeader,
  Spinner,
} from '@adopt-dont-shop/lib.components';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import { useReports, useReportTemplates } from '@adopt-dont-shop/lib.analytics';
import * as styles from './Reports.css';

/**
 * ADS-105: Rescue Reports list page.
 *
 * Mirrors app.admin/src/pages/Reports.tsx but scoped to the rescue's
 * own reports + their custom templates. Authorization (`reports.read.rescue`)
 * is enforced at the backend.
 */

const ReportsPage: React.FC = () => {
  const reportsQuery = useReports();
  const templatesQuery = useReportTemplates();

  return (
    <div className={styles.container}>
      <PageHeader
        title="Reports"
        description="Build custom reports for your rescue, schedule them, and share with the team."
        actions={
          <Link to="/reports/new">
            <Button variant="primary">New report</Button>
          </Link>
        }
      />

      <section className={styles.section}>
        <Heading level="h2">Your reports</Heading>
        {reportsQuery.isLoading ? (
          <Spinner label="Loading…" />
        ) : reportsQuery.isError ? (
          <ErrorState message="Failed to load reports." />
        ) : (reportsQuery.data ?? []).length === 0 ? (
          <EmptyState title="No saved reports yet — pick a template below to start." />
        ) : (
          <div className={styles.reportList}>
            {(reportsQuery.data ?? []).map(report => (
              <Link
                key={report.saved_report_id}
                to={`/reports/${report.saved_report_id}`}
                className={styles.reportRow}
              >
                <strong>{report.name}</strong>
                <span className={styles.updatedMeta}>
                  Updated {formatDisplayDate(report.updated_at)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <Heading level="h2">Templates</Heading>
        {templatesQuery.isLoading ? (
          <Spinner label="Loading…" />
        ) : (templatesQuery.data ?? []).length === 0 ? (
          <EmptyState title="No templates available." />
        ) : (
          <div className={styles.templateGrid}>
            {(templatesQuery.data ?? []).map(template => (
              <Link
                key={template.template_id}
                to={`/reports/new?template=${template.template_id}`}
                className={styles.templateCard}
              >
                <strong>{template.name}</strong>
                <div className={styles.templateMeta}>
                  {template.description ?? `${template.category} report`}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ReportsPage;
