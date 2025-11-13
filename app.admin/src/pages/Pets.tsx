import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { Heading, Text } from '@adopt-dont-shop/lib.components';
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

const Pets: React.FC = () => {
  const { petId } = useParams<{ petId?: string }>();

  useEffect(() => {
    if (petId) {
      // TODO: Load pet details when petId is provided
      console.log('Loading pet:', petId);
    }
  }, [petId]);

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>Pet Management</Heading>
          <Text>
            {petId
              ? `Viewing details for pet: ${petId}`
              : 'Browse and manage all pet listings on the platform'}
          </Text>
        </HeaderLeft>
      </PageHeader>

      {petId && (
        <InfoBanner>
          <FiAlertCircle size={20} />
          <div>
            <strong>Direct Link Navigation</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
              You've navigated to this pet via a direct link (e.g., from a moderation report). The
              full pet management interface is under development.
            </p>
          </div>
        </InfoBanner>
      )}

      <ContentCard>
        {petId ? (
          <>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Pet Details</h2>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Pet ID:{' '}
              <code
                style={{
                  background: '#f3f4f6',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {petId}
              </code>
            </p>
            <p style={{ color: '#6b7280', marginTop: '1rem' }}>
              Full pet details view will be implemented here. This will include:
            </p>
            <ul style={{ color: '#6b7280', marginTop: '0.5rem' }}>
              <li>Pet information (name, breed, age, etc.)</li>
              <li>Associated rescue organization</li>
              <li>Adoption status</li>
              <li>Photos and description</li>
              <li>Moderation history</li>
            </ul>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>All Pets</h2>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Pet listing and management interface will be implemented here. This will include:
            </p>
            <ul style={{ color: '#6b7280', marginTop: '0.5rem' }}>
              <li>Searchable pet listings</li>
              <li>Filter by rescue, status, species</li>
              <li>Bulk actions</li>
              <li>Export capabilities</li>
            </ul>
          </>
        )}
      </ContentCard>
    </PageContainer>
  );
};

export default Pets;
