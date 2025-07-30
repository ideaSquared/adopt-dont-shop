import React from 'react';
import styled from 'styled-components';
import {
  Card,
  CardContent,
  Heading,
  Text,
  Container,
} from '@adopt-dont-shop/components';

// Styled Components
const ApplicationsContainer = styled(Container)`
  max-width: 1400px;
  padding: 2rem 1rem;
`;

const HeaderSection = styled.div`
  margin-bottom: 2rem;
`;

const PlaceholderCard = styled(Card)`
  text-align: center;
  padding: 3rem;
  margin: 2rem 0;
`;

/**
 * ApplicationsPage component for managing adoption applications
 * This is a simplified version during library migration
 */
export const ApplicationsPage: React.FC = () => {
  return (
    <ApplicationsContainer>
      <HeaderSection>
        <Heading level="h1">Adoption Applications</Heading>
        <Text color="muted">Review and manage adoption applications from potential adopters</Text>
      </HeaderSection>

      <PlaceholderCard>
        <CardContent>
          <Heading level="h3">Applications Management</Heading>
          <Text color="muted" style={{ margin: '1rem 0' }}>
            The applications management system is being migrated to use the library services.
            This page will be fully functional once the migration is complete.
          </Text>
          <Text size="sm" color="muted">
            Features coming soon:
            <br />
            • Application review and processing
            <br />
            • Communication with adopters
            <br />
            • Application status tracking
            <br />
            • Reference checking
            <br />
            • Decision workflow
          </Text>
        </CardContent>
      </PlaceholderCard>
    </ApplicationsContainer>
  );
};
