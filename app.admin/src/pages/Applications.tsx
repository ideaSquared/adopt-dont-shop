import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { Heading, Text } from '@adopt-dont-shop/components';
import { FiAlertCircle } from 'react-icons/fi';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderLeft = styled.div`
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
  }
`;

const ContentCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
`;

const InfoBanner = styled.div`
  background: #dbeafe;
  border: 1px solid #60a5fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: #1e40af;

  svg {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }
`;

const Applications: React.FC = () => {
  const { applicationId } = useParams<{ applicationId?: string }>();

  useEffect(() => {
    if (applicationId) {
      // TODO: Load application details when applicationId is provided
      console.log('Loading application:', applicationId);
    }
  }, [applicationId]);

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Application Management</Heading>
          <Text>
            {applicationId
              ? `Viewing details for application: ${applicationId}`
              : 'Browse and manage all adoption applications'}
          </Text>
        </HeaderLeft>
      </PageHeader>

      {applicationId && (
        <InfoBanner>
          <FiAlertCircle size={20} />
          <div>
            <strong>Direct Link Navigation</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
              You've navigated to this application via a direct link (e.g., from a moderation
              report). The full application management interface is under development.
            </p>
          </div>
        </InfoBanner>
      )}

      <ContentCard>
        {applicationId ? (
          <>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Application Details</h2>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Application ID:{' '}
              <code
                style={{
                  background: '#f3f4f6',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {applicationId}
              </code>
            </p>
            <p style={{ color: '#6b7280', marginTop: '1rem' }}>
              Full application details view will be implemented here. This will include:
            </p>
            <ul style={{ color: '#6b7280', marginTop: '0.5rem' }}>
              <li>Applicant information</li>
              <li>Pet and rescue details</li>
              <li>Application questions and answers</li>
              <li>Status and timeline</li>
              <li>Moderation history</li>
            </ul>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>All Applications</h2>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Application listing and management interface will be implemented here. This will
              include:
            </p>
            <ul style={{ color: '#6b7280', marginTop: '0.5rem' }}>
              <li>Searchable application listings</li>
              <li>Filter by status, rescue, applicant</li>
              <li>Bulk actions</li>
              <li>Export capabilities</li>
            </ul>
          </>
        )}
      </ContentCard>
    </PageContainer>
  );
};

export default Applications;
