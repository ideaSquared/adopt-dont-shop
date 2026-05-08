import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Heading, Text } from '@adopt-dont-shop/lib.components';
import { FiPlus } from 'react-icons/fi';
import { useReports, useReportTemplates } from '@adopt-dont-shop/lib.analytics';
import {
  PageContainer,
  PageHeader,
  HeaderLeft,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../components/ui';
import * as styles from './Reports.css';

/**
 * ADS-105: Admin Reports list page.
 *
 * Replaces the mock-data version. Lists user-saved reports + system
 * report templates, both fetched live via the @adopt-dont-shop/
 * lib.analytics React Query hooks.
 */

const Reports: React.FC = () => {
  const reportsQuery = useReports();
  const templatesQuery = useReportTemplates();

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Reports</Heading>
          <Text>Build, schedule, and share custom analytics reports.</Text>
        </HeaderLeft>
        <Link to='/reports/new'>
          <Button variant='primary'>
            <FiPlus className={styles.buttonIcon} />
            New report
          </Button>
        </Link>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Your reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reportsQuery.isLoading ? (
            <Text>Loading…</Text>
          ) : reportsQuery.isError ? (
            <Text>Failed to load reports.</Text>
          ) : (reportsQuery.data ?? []).length === 0 ? (
            <Text>You haven&apos;t saved any reports yet. Start with a template below.</Text>
          ) : (
            <div className={styles.reportList}>
              {(reportsQuery.data ?? []).map(report => (
                <Link
                  key={report.saved_report_id}
                  to={`/reports/${report.saved_report_id}`}
                  className={styles.reportRow}
                >
                  <div>
                    <strong>{report.name}</strong>
                    {report.description ? (
                      <div className={styles.subtleSmall}>{report.description}</div>
                    ) : null}
                  </div>
                  <div className={styles.subtleScope}>
                    {report.rescue_id ? 'Rescue scope' : 'Platform scope'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={styles.templatesCard}>
        <CardHeader>
          <CardTitle>Report templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templatesQuery.isLoading ? (
            <Text>Loading…</Text>
          ) : (
            <div className={styles.templatesGrid}>
              {(templatesQuery.data ?? []).map(template => (
                <Link
                  key={template.template_id}
                  to={`/reports/new?template=${template.template_id}`}
                  className={styles.templateCard}
                >
                  <strong>{template.name}</strong>
                  <div className={styles.templateDescription}>
                    {template.description ?? `${template.category} report`}
                  </div>
                </Link>
              ))}
              {(templatesQuery.data ?? []).length === 0 ? (
                <Text>No templates available.</Text>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default Reports;
