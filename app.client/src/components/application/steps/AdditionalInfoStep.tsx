import { ApplicationData } from '@/types';
import React from 'react';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';

interface AdditionalInfoStepProps {
  data: ApplicationData['additionalInfo'];
  onComplete: (data: ApplicationData['additionalInfo']) => void;
}

interface AdditionalInfoFormData {
  whyAdopt: string;
  expectations: string;
  emergencyPlan: string;
  agreement: boolean;
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

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 500;
  color: ${props => props.theme.text.primary};
  margin-bottom: 0.5rem;
`;

const TextArea = styled.textarea<{ hasError?: boolean }>`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid
    ${props =>
      props.hasError ? props.theme.colors.semantic.error[500] : props.theme.border.color.secondary};
  border-radius: 4px;
  background: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${props =>
      props.hasError ? props.theme.colors.semantic.error[500] : props.theme.colors.primary[500]};
    box-shadow: 0 0 0 2px
      ${props =>
        props.hasError ? props.theme.colors.semantic.error[100] : props.theme.colors.primary[100]};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const CheckboxLabel = styled.label`
  font-size: 0.9rem;
  color: ${props => props.theme.text.primary};
  line-height: 1.5;
`;

const ErrorMessage = styled.span`
  color: ${props => props.theme.colors.semantic.error[500]};
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

const CheckboxInput = styled.input<{ hasError?: boolean }>`
  margin: 0;
  border: 1px solid
    ${props =>
      props.hasError ? props.theme.colors.semantic.error[500] : props.theme.border.color.secondary};

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px
      ${props =>
        props.hasError ? props.theme.colors.semantic.error[100] : props.theme.colors.primary[100]};
  }
`;

export const AdditionalInfoStep: React.FC<AdditionalInfoStepProps> = ({ data, onComplete }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdditionalInfoFormData>({
    defaultValues: {
      whyAdopt: data?.whyAdopt || '',
      expectations: data?.expectations || '',
      emergencyPlan: data?.emergencyPlan || '',
      agreement: data?.agreement || false,
    },
  });

  const onSubmit = (formData: AdditionalInfoFormData) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('AdditionalInfoStep onSubmit called with:', formData);
    }
    onComplete(formData as ApplicationData['additionalInfo']);
  };

  return (
    <StepContainer>
      <StepTitle>Additional Information</StepTitle>
      <StepDescription>
        Help us understand your motivations and expectations for pet adoption.
      </StepDescription>

      <Form id='step-5-form' onSubmit={handleSubmit(onSubmit)}>
        <FormGroup>
          <Label>Why do you want to adopt a pet? *</Label>
          <TextArea
            hasError={!!errors.whyAdopt}
            {...register('whyAdopt', {
              required: 'Please tell us why you want to adopt a pet',
              minLength: {
                value: 50,
                message:
                  'Please provide at least 50 characters to help us understand your motivations',
              },
            })}
            placeholder='Tell us about your motivations for adopting a pet. What are you hoping to gain from the experience?'
          />
          {errors.whyAdopt && <ErrorMessage>{errors.whyAdopt.message}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>What are your expectations for pet ownership? *</Label>
          <TextArea
            hasError={!!errors.expectations}
            {...register('expectations', {
              required: 'Please describe your expectations for pet ownership',
              minLength: {
                value: 50,
                message:
                  'Please provide at least 50 characters to help us understand your expectations',
              },
            })}
            placeholder='Describe what you expect from daily life with a pet. Consider time commitment, costs, behavioral aspects, etc.'
          />
          {errors.expectations && <ErrorMessage>{errors.expectations.message}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>Emergency Plan *</Label>
          <TextArea
            hasError={!!errors.emergencyPlan}
            {...register('emergencyPlan', {
              required: 'Please describe your emergency plan for pet care',
              minLength: {
                value: 30,
                message: 'Please provide at least 30 characters for your emergency plan',
              },
            })}
            placeholder='Describe your plan for pet care during emergencies, vacations, or unexpected situations. Include backup caregivers and emergency vet information.'
          />
          {errors.emergencyPlan && <ErrorMessage>{errors.emergencyPlan.message}</ErrorMessage>}
        </FormGroup>

        <CheckboxGroup>
          <CheckboxInput
            type='checkbox'
            {...register('agreement', {
              required: 'You must agree to the terms before proceeding',
            })}
            hasError={!!errors.agreement}
          />
          <CheckboxLabel>
            I understand that adopting a pet is a long-term commitment and I agree to provide proper
            care, including regular veterinary checkups, appropriate nutrition, exercise, and a safe
            living environment. I also understand that the rescue organization may conduct follow-up
            visits to ensure the pet&apos;s welfare.
          </CheckboxLabel>
        </CheckboxGroup>
        {errors.agreement && <ErrorMessage>{errors.agreement.message}</ErrorMessage>}
      </Form>
    </StepContainer>
  );
};
