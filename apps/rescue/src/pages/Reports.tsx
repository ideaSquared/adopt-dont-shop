import React from 'react';
import { Link } from 'react-router-dom';
import { Heading, Text } from '@adopt-dont-shop/lib.components';
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
      <div className={styles.header}>
        <div>
          <Heading level="h1">Reports</Heading>
          <Text>Build custom reports for your rescue, schedule them, and share with the team.</Text>
        </div>
        <Link to="/reports/new">
          <button type="button">New report</button>
        </Link>
      </div>

      <section className={styles.section}>
        <Heading level="h2">Your reports</Heading>
        {reportsQuery.isLoading ? (
          <Text>Loading…</Text>
        ) : (reportsQuery.data ?? []).length === 0 ? (
          <Text>No saved reports yet — pick a template below to start.</Text>
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
                  Updated {new Date(report.updated_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <Heading level="h2">Templates</Heading>
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
      </section>
    </div>
  );
};

export default ReportsPage;
