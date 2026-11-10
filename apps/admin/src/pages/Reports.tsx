import React from 'react';
import { Link } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ErrorState,
  Heading,
  PageHeader,
  QueryBoundary,
  Spinner,
  Stack,
  Text,
} from '@adopt-dont-shop/lib.components';
import { Plus } from 'lucide-react';
import { useReports, useReportTemplates } from '@adopt-dont-shop/lib.analytics';
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
  const reports = reportsQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  return (
    <Stack spacing='lg'>
      <PageHeader
        title='Reports'
        description='Build, schedule, and share custom analytics reports.'
        actions={
          <Link to='/reports/new'>
            <Button variant='primary' startIcon={<Plus size='1em' />}>
              New report
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <Heading level='h2' size='lg' noMargin>
            Your reports
          </Heading>
        </CardHeader>
        <CardContent>
          <QueryBoundary
            isLoading={reportsQuery.isLoading}
            isError={reportsQuery.isError}
            isEmpty={reports.length === 0}
            loadingFallback={<Spinner />}
            errorFallback={<ErrorState message='Failed to load reports.' />}
            emptyFallback={
              <EmptyState
                size='sm'
                title="You haven't saved any reports yet."
                description='Start with a template below.'
              />
            }
          >
            <div className={styles.reportList}>
              {reports.map(report => (
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
          </QueryBoundary>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Heading level='h2' size='lg' noMargin>
            Report templates
          </Heading>
        </CardHeader>
        <CardContent>
          <QueryBoundary
            isLoading={templatesQuery.isLoading}
            isEmpty={templates.length === 0}
            loadingFallback={<Spinner />}
            emptyFallback={<Text>No templates available.</Text>}
          >
            <div className={styles.templatesGrid}>
              {templates.map(template => (
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
            </div>
          </QueryBoundary>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default Reports;
