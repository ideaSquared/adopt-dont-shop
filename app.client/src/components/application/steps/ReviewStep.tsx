import { ApplicationData, Pet } from '@/services';
import React from 'react';
import styled from 'styled-components';

interface ReviewStepProps {
  data: Partial<ApplicationData>;
  pet: Pet | null;
  onComplete: (data: ApplicationData['additionalInfo']) => void;
  isUpdate: boolean;
}

const StepContainer = styled.div`
  max-width: 600px;
`;

const StepTitle = styled.h2`
  font-size: 1.5rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 0.5rem;
`;

const StepDescription = styled.p`
  color: ${props => props.theme.text.secondary};
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: grid;
  gap: 1.5rem;
`;

const ReviewSection = styled.div`
  padding: 1.5rem;
  background: ${props => props.theme.background.secondary};
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 1rem;
`;

const ReviewItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};

  &:last-child {
    border-bottom: none;
  }
`;

const Label = styled.span`
  font-weight: 500;
  color: ${props => props.theme.text.secondary};
`;

const Value = styled.span`
  color: ${props => props.theme.text.primary};
`;

export const ReviewStep: React.FC<ReviewStepProps> = ({ data, pet, onComplete, isUpdate }) => {
  const handleContinue = () => {
    onComplete({
      whyAdopt: 'I want to provide a loving home for a pet in need.',
      expectations: 'I expect to provide daily care, exercise, and companionship.',
      emergencyPlan: 'I have a local emergency vet and backup caregiver.',
      agreement: true,
    });
  };

  return (
    <StepContainer>
      <StepTitle>Review & Submit</StepTitle>
      <StepDescription>Please review your application details before submitting.</StepDescription>

      <Form
        id='step-5-form'
        onSubmit={e => {
          e.preventDefault();
          handleContinue();
        }}
      >
        {pet && (
          <ReviewSection>
            <SectionTitle>Pet Information</SectionTitle>
            <ReviewItem>
              <Label>Pet Name:</Label>
              <Value>{pet.name}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Type:</Label>
              <Value>{pet.type}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Breed:</Label>
              <Value>{pet.breed}</Value>
            </ReviewItem>
          </ReviewSection>
        )}

        {data.personalInfo && (
          <ReviewSection>
            <SectionTitle>Personal Information</SectionTitle>
            <ReviewItem>
              <Label>Name:</Label>
              <Value>
                {data.personalInfo.firstName} {data.personalInfo.lastName}
              </Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Email:</Label>
              <Value>{data.personalInfo.email}</Value>
            </ReviewItem>
            <ReviewItem>
              <Label>Phone:</Label>
              <Value>{data.personalInfo.phone}</Value>
            </ReviewItem>
          </ReviewSection>
        )}

        <ReviewSection>
          <SectionTitle>Application Status</SectionTitle>
          <p>
            {isUpdate
              ? 'You are updating an existing application.'
              : 'This is a new application submission.'}
          </p>
          <p>By submitting this application, you agree to our terms and conditions.</p>
        </ReviewSection>
      </Form>
    </StepContainer>
  );
};
