import { ApplicationData } from '@/services';
import React from 'react';
import styled from 'styled-components';

interface PetExperienceStepProps {
  data: Partial<ApplicationData['petExperience']>;
  onComplete: (data: ApplicationData['petExperience']) => void;
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

const PlaceholderText = styled.div`
  padding: 2rem;
  background: ${props => props.theme.background.secondary};
  border-radius: 8px;
  text-align: center;
  color: ${props => props.theme.text.secondary};
`;

export const PetExperienceStep: React.FC<PetExperienceStepProps> = ({ onComplete }) => {
  const handleContinue = () => {
    onComplete({
      hasPetsCurrently: false,
      experienceLevel: 'some',
      willingToTrain: true,
      hoursAloneDaily: 4,
      exercisePlans: 'Daily walks and playtime',
    });
  };

  return (
    <StepContainer>
      <StepTitle>Pet Experience</StepTitle>
      <StepDescription>
        Tell us about your experience with pets and how you plan to care for your new companion.
      </StepDescription>

      <Form
        id='step-3-form'
        onSubmit={e => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <PlaceholderText>
          Pet Experience form coming soon...
          <br />
          <small>
            This will include questions about current pets, previous experience, and care plans.
          </small>
        </PlaceholderText>
      </Form>
    </StepContainer>
  );
};
