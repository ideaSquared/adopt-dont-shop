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
            <FiPlus style={{ marginRight: '0.5rem' }} />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(reportsQuery.data ?? []).map(report => (
                <Link
                  key={report.saved_report_id}
                  to={`/reports/${report.saved_report_id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div>
                    <strong>{report.name}</strong>
                    {report.description ? (
                      <div style={{ color: '#6b7280', fontSize: '13px' }}>{report.description}</div>
                    ) : null}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '12px' }}>
                    {report.rescue_id ? 'Rescue scope' : 'Platform scope'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card style={{ marginTop: '16px' }}>
        <CardHeader>
          <CardTitle>Report templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templatesQuery.isLoading ? (
            <Text>Loading…</Text>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '12px',
              }}
            >
              {(templatesQuery.data ?? []).map(template => (
                <Link
                  key={template.template_id}
                  to={`/reports/new?template=${template.template_id}`}
                  style={{
                    display: 'block',
                    padding: '14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <strong>{template.name}</strong>
                  <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
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
