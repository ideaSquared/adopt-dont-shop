import { applicationService } from '@/services/applicationService';
import { Application } from '@/types';
import { Alert, Button, Spinner } from '@adopt-dont-shop/components';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';

import { WithdrawApplicationModal } from '../components/application';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    color: ${props => props.theme.text.primary};
    margin-bottom: 0.5rem;
  }

  p {
    color: ${props => props.theme.text.secondary};
  }
`;

const Section = styled.div`
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 1rem;
`;

const InfoGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-weight: 500;
  color: ${props => props.theme.text.secondary};
  min-width: 120px;
`;

const InfoValue = styled.span`
  color: ${props => props.theme.text.primary};
  text-align: right;
  flex: 1;
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;

  ${props => {
    switch (props.$status) {
      case 'submitted':
        return `
          background: ${props.theme.colors.secondary[100]};
          color: ${props.theme.colors.secondary[700]};
        `;
      case 'under_review':
        return `
          background: ${props.theme.colors.primary[100]};
          color: ${props.theme.colors.primary[700]};
        `;
      case 'approved':
        return `
          background: ${props.theme.colors.semantic.success[100]};
          color: ${props.theme.colors.semantic.success[700]};
        `;
      case 'rejected':
        return `
          background: ${props.theme.colors.semantic.error[100]};
          color: ${props.theme.colors.semantic.error[700]};
        `;
      default:
        return `
          background: ${props.theme.colors.neutral[100]};
          color: ${props.theme.colors.neutral[700]};
        `;
    }
  }}
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

export const ApplicationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadApplication = async () => {
      if (!id) {
        setError('Application ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const app = await applicationService.getApplicationById(id);
        setApplication(app);
      } catch (error) {
        console.error('Failed to load application:', error);
        setError('Failed to load application details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadApplication();
  }, [id]);

  const handleWithdraw = async (reason?: string) => {
    if (!application) return;

    setIsWithdrawing(true);
    try {
      const updatedApplication = await applicationService.withdrawApplication(
        application.id,
        reason
      );

      setApplication(updatedApplication);
      setSuccessMessage('Application withdrawn successfully');
      setIsWithdrawModalOpen(false);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Failed to withdraw application:', error);
      // Error handling is done in the modal
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <Spinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error || !application) {
    return (
      <Container>
        <Alert variant='error'>{error || 'Application not found'}</Alert>
        <ButtonGroup>
          <Button onClick={() => navigate('/profile')}>Back to Profile</Button>
        </ButtonGroup>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h1>Application Details</h1>
        <p>Application #{application.id.slice(-6)}</p>
      </Header>

      {successMessage && (
        <Alert variant='success' title='Success'>
          {successMessage}
        </Alert>
      )}

      <Section>
        <SectionTitle>Application Status</SectionTitle>
        <InfoGrid>
          <InfoItem>
            <InfoLabel>Status</InfoLabel>
            <InfoValue>
              <StatusBadge $status={application.status}>
                {application.status.replace('_', ' ')}
              </StatusBadge>
            </InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Submitted</InfoLabel>
            <InfoValue>{formatDate(application.submittedAt)}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Last Updated</InfoLabel>
            <InfoValue>{formatDate(application.updatedAt)}</InfoValue>
          </InfoItem>
          {application.reviewedAt && (
            <InfoItem>
              <InfoLabel>Reviewed</InfoLabel>
              <InfoValue>{formatDate(application.reviewedAt)}</InfoValue>
            </InfoItem>
          )}
          {application.reviewedBy && (
            <InfoItem>
              <InfoLabel>Reviewed By</InfoLabel>
              <InfoValue>{application.reviewedBy}</InfoValue>
            </InfoItem>
          )}
        </InfoGrid>
      </Section>

      <Section>
        <SectionTitle>Pet Information</SectionTitle>
        <InfoGrid>
          <InfoItem>
            <InfoLabel>Pet ID</InfoLabel>
            <InfoValue>{application.petId}</InfoValue>
          </InfoItem>
        </InfoGrid>
      </Section>

      <Section>
        <SectionTitle>Application Information</SectionTitle>
        <InfoGrid>
          <InfoItem>
            <InfoLabel>Application ID</InfoLabel>
            <InfoValue>{application.id}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Rescue ID</InfoLabel>
            <InfoValue>{application.rescueId}</InfoValue>
          </InfoItem>
          {application.reviewNotes && (
            <InfoItem>
              <InfoLabel>Review Notes</InfoLabel>
              <InfoValue>{application.reviewNotes}</InfoValue>
            </InfoItem>
          )}
        </InfoGrid>
      </Section>

      <ButtonGroup>
        <Button onClick={() => navigate('/profile')}>Back to Profile</Button>
        {application.status === 'submitted' && (
          <Button
            variant='secondary'
            onClick={() => setIsWithdrawModalOpen(true)}
            style={{
              backgroundColor: '#dc2626',
              borderColor: '#dc2626',
              color: 'white',
            }}
          >
            Withdraw Application
          </Button>
        )}
      </ButtonGroup>

      <WithdrawApplicationModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onConfirm={handleWithdraw}
        isLoading={isWithdrawing}
      />
    </Container>
  );
};

export default ApplicationDetailsPage;
