import { ApplicationData } from '@/types';
import { Input } from '@adopt-dont-shop/components';
import React from 'react';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';

interface LivingSituationStepProps {
  data: Partial<ApplicationData['livingsituation']>;
  onComplete: (data: ApplicationData['livingsituation']) => void;
}

interface LivingSituationFormData {
  housingType: string;
  isOwned: boolean;
  hasYard: boolean;
  yardSize: string;
  yardFenced: boolean;
  allowsPets: boolean;
  landlordContact: string;
  householdSize: number;
  hasAllergies: boolean;
  allergyDetails: string;
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
  font-size: 0.875rem;
`;

const StyledSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 8px;
  font-size: 1rem;
  background: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const LivingSituationStep: React.FC<LivingSituationStepProps> = ({ data, onComplete }) => {
  const { register, handleSubmit } = useForm<LivingSituationFormData>({
    defaultValues: {
      housingType: data.housingType || '',
      isOwned: data.isOwned || false,
      hasYard: data.hasYard || false,
      yardSize: data.yardSize || '',
      yardFenced: data.yardFenced || false,
      allowsPets: data.allowsPets || true,
      landlordContact: data.landlordContact || '',
      householdSize: data.householdSize || 1,
      hasAllergies: data.hasAllergies || false,
      allergyDetails: data.allergyDetails || '',
    },
  });

  const onSubmit = (formData: LivingSituationFormData) => {
    onComplete(formData as ApplicationData['livingsituation']);
  };

  return (
    <StepContainer>
      <StepTitle>Living Situation</StepTitle>
      <StepDescription>
        Tell us about your living environment to help us ensure it&apos;s a good fit for the pet.
      </StepDescription>

      <Form id='step-2-form' onSubmit={handleSubmit(onSubmit)}>
        <FormGroup>
          <Label>Housing Type *</Label>
          <StyledSelect {...register('housingType', { required: true })}>
            <option value=''>Select housing type</option>
            <option value='house'>House</option>
            <option value='apartment'>Apartment</option>
            <option value='condo'>Condo</option>
            <option value='other'>Other</option>
          </StyledSelect>
        </FormGroup>

        <CheckboxGroup>
          <input type='checkbox' {...register('isOwned')} />
          <Label>I own my home</Label>
        </CheckboxGroup>

        <CheckboxGroup>
          <input type='checkbox' {...register('hasYard')} />
          <Label>I have a yard</Label>
        </CheckboxGroup>

        <FormGroup>
          <Label>Yard Size</Label>
          <StyledSelect {...register('yardSize')}>
            <option value=''>Select yard size</option>
            <option value='small'>Small</option>
            <option value='medium'>Medium</option>
            <option value='large'>Large</option>
          </StyledSelect>
        </FormGroup>

        <CheckboxGroup>
          <input type='checkbox' {...register('yardFenced')} />
          <Label>My yard is fenced</Label>
        </CheckboxGroup>

        <CheckboxGroup>
          <input type='checkbox' {...register('allowsPets')} />
          <Label>Pets are allowed in my housing</Label>
        </CheckboxGroup>

        <FormGroup>
          <Label>Household Size *</Label>
          <Input
            {...register('householdSize', { required: true })}
            type='number'
            min='1'
            placeholder='Number of people in household'
          />
        </FormGroup>

        <CheckboxGroup>
          <input type='checkbox' {...register('hasAllergies')} />
          <Label>Someone in my household has pet allergies</Label>
        </CheckboxGroup>

        <FormGroup>
          <Label>Allergy Details</Label>
          <Input {...register('allergyDetails')} placeholder='Please describe any allergies' />
        </FormGroup>
      </Form>
    </StepContainer>
  );
};
