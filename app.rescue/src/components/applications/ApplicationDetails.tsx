import React from 'react';
import styled from 'styled-components';
import { Card, CardHeader, CardContent, Heading, Text, Button } from '@adopt-dont-shop/components';
import { FiX, FiCheck, FiMessageCircle, FiCalendar, FiMail } from 'react-icons/fi';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(Card)`
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ApplicationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

const PetSection = styled.div`
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
`;

const QuestionsSection = styled.div`
  margin-bottom: 2rem;
`;

const QuestionItem = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;

  &:last-child {
    border-bottom: none;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: flex-end;
`;

interface Application {
  application_id: string;
  applicant_name: string;
  applicant_email: string;
  pet_name: string;
  pet_id: string;
  status: string;
  submitted_at: string;
  priority: string;
}

interface ApplicationDetailsProps {
  application: Application;
  onClose: () => void;
  onApprove: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  onOpenChat: () => void;
}

const mockApplicationDetails = {
  experience_with_pets: 'I have had dogs for over 10 years and currently have a 5-year-old Golden Retriever.',
  living_situation: 'I live in a house with a large fenced yard.',
  household_members: '2 adults, 1 child (age 8)',
  work_schedule: 'Work from home 3 days a week, office 2 days a week',
  veterinarian: 'Dr. Smith at Happy Pets Veterinary Clinic',
  emergency_contact: 'Jane Doe - (555) 987-6543',
  references: 'Mike Johnson (neighbor) - (555) 123-4567, Sarah Wilson (friend) - (555) 234-5678',
  why_adopt: 'We lost our beloved dog recently and are ready to open our hearts to another rescue pet.',
  expectations: 'Looking for a friendly, medium-sized dog that gets along well with children.',
};

export const ApplicationDetails: React.FC<ApplicationDetailsProps> = ({
  application,
  onClose,
  onApprove,
  onReject,
  onOpenChat,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <ApplicationHeader>
            <div>
              <Heading level="h2">Application Details</Heading>
              <Text color="muted">
                Submitted {formatDate(application.submitted_at)}
              </Text>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <FiX />
            </Button>
          </ApplicationHeader>
        </CardHeader>

        <CardContent>
          {/* Applicant Information */}
          <div style={{ marginBottom: '2rem' }}>
            <Heading level="h3">Applicant Information</Heading>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <Text weight="bold">Name:</Text>
                <Text>{application.applicant_name}</Text>
              </div>
              <div>
                <Text weight="bold">Email:</Text>
                <Text>{application.applicant_email}</Text>
              </div>
              <div>
                <Text weight="bold">Status:</Text>
                <Text>{application.status}</Text>
              </div>
              <div>
                <Text weight="bold">Priority:</Text>
                <Text>{application.priority}</Text>
              </div>
            </div>
          </div>

          {/* Pet Information */}
          <PetSection>
            <Heading level="h3">Pet of Interest</Heading>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <Text weight="bold" size="lg">{application.pet_name}</Text>
                <Text color="muted">Pet ID: {application.pet_id}</Text>
              </div>
            </div>
          </PetSection>

          {/* Application Questions */}
          <QuestionsSection>
            <Heading level="h3">Application Responses</Heading>
            
            <QuestionItem>
              <Text weight="bold">Experience with pets:</Text>
              <Text>{mockApplicationDetails.experience_with_pets}</Text>
            </QuestionItem>

            <QuestionItem>
              <Text weight="bold">Living situation:</Text>
              <Text>{mockApplicationDetails.living_situation}</Text>
            </QuestionItem>

            <QuestionItem>
              <Text weight="bold">Household members:</Text>
              <Text>{mockApplicationDetails.household_members}</Text>
            </QuestionItem>

            <QuestionItem>
              <Text weight="bold">Work schedule:</Text>
              <Text>{mockApplicationDetails.work_schedule}</Text>
            </QuestionItem>

            <QuestionItem>
              <Text weight="bold">Veterinarian:</Text>
              <Text>{mockApplicationDetails.veterinarian}</Text>
            </QuestionItem>

            <QuestionItem>
              <Text weight="bold">Emergency contact:</Text>
              <Text>{mockApplicationDetails.emergency_contact}</Text>
            </QuestionItem>

            <QuestionItem>
              <Text weight="bold">References:</Text>
              <Text>{mockApplicationDetails.references}</Text>
            </QuestionItem>

            <QuestionItem>
              <Text weight="bold">Why do you want to adopt?</Text>
              <Text>{mockApplicationDetails.why_adopt}</Text>
            </QuestionItem>

            <QuestionItem>
              <Text weight="bold">What are your expectations?</Text>
              <Text>{mockApplicationDetails.expectations}</Text>
            </QuestionItem>
          </QuestionsSection>

          {/* Action Buttons */}
          <ActionButtons>
            <Button variant="outline" onClick={onOpenChat}>
              <FiMessageCircle /> Message Applicant
            </Button>
            <Button variant="outline" onClick={() => window.open(`mailto:${application.applicant_email}`)}>
              <FiMail /> Send Email
            </Button>
            <Button variant="outline" onClick={onClose}>
              <FiCalendar /> Schedule Visit
            </Button>
            {application.status === 'pending' && (
              <>
                <Button variant="outline" onClick={() => onReject(application.application_id)}>
                  <FiX /> Reject
                </Button>
                <Button onClick={() => onApprove(application.application_id)}>
                  <FiCheck /> Approve
                </Button>
              </>
            )}
          </ActionButtons>
        </CardContent>
      </ModalContent>
    </ModalOverlay>
  );
};
