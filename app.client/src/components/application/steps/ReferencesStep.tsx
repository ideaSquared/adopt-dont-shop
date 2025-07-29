import { ApplicationData } from '@/services';
import React from 'react';
import styled from 'styled-components';

interface ReferencesStepProps {
  data: Partial<ApplicationData['references']>;
  onComplete: (data: ApplicationData['references']) => void;
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

export const ReferencesStep: React.FC<ReferencesStepProps> = ({ onComplete }) => {
  const handleContinue = () => {
    onComplete({
      personal: [
        {
          name: 'Reference Name',
          relationship: 'Friend',
          phone: '555-0123',
          email: 'reference@example.com',
          yearsKnown: 5,
        },
      ],
    });
  };

  return (
    <StepContainer>
      <StepTitle>References</StepTitle>
      <StepDescription>
        Please provide contact information for references who can speak to your character and
        ability to care for a pet.
      </StepDescription>

      <Form
        id='step-4-form'
        onSubmit={e => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <PlaceholderText>
          References form coming soon...
          <br />
          <small>This will include fields for veterinary and personal references.</small>
        </PlaceholderText>
      </Form>
    </StepContainer>
  );
};
