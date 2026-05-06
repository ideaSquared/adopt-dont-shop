import React from 'react';
import { Link } from 'react-router-dom';
import { Heading, Text } from '@adopt-dont-shop/lib.components';
import { useReports, useReportTemplates } from '@adopt-dont-shop/lib.analytics';

/**
 * ADS-105: Rescue Reports list page.
 *
 * Mirrors app.admin/src/pages/Reports.tsx but scoped to the rescue's
 * own reports + their custom templates. Authorization (`reports.read.rescue`)
 * is enforced at the backend.
 */

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const ReportsPage: React.FC = () => {
  const reportsQuery = useReports();
  const templatesQuery = useReportTemplates();

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <Heading level="h1">Reports</Heading>
          <Text>Build custom reports for your rescue, schedule them, and share with the team.</Text>
        </div>
        <Link to="/reports/new">
          <button type="button">New report</button>
        </Link>
      </div>

      <section
        style={{
          padding: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          background: '#fff',
        }}
      >
        <Heading level="h2">Your reports</Heading>
        {reportsQuery.isLoading ? (
          <Text>Loading…</Text>
        ) : (reportsQuery.data ?? []).length === 0 ? (
          <Text>No saved reports yet — pick a template below to start.</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
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
                <strong>{report.name}</strong>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                  Updated {new Date(report.updated_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section
        style={{
          padding: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          background: '#fff',
        }}
      >
        <Heading level="h2">Templates</Heading>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px',
            marginTop: '12px',
          }}
        >
          {(templatesQuery.data ?? []).map(template => (
            <Link
              key={template.template_id}
              to={`/reports/new?template=${template.template_id}`}
              style={{
                display: 'block',
                padding: '12px',
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
        </div>
      </section>
    </div>
  );
};

export default ReportsPage;
