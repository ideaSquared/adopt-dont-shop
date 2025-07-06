import { ApplicationData } from '@/types';
import { Input } from '@adopt-dont-shop/components';
import React from 'react';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';

interface BasicInfoStepProps {
  data: Partial<ApplicationData['personalInfo']>;
  onComplete: (data: ApplicationData['personalInfo']) => void;
}

const StepContainer = styled.div`
  padding: 2rem 0;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const FullWidthField = styled.div`
  grid-column: 1 / -1;
`;

const Title = styled.h3`
  color: ${props => props.theme.colors.neutral[900]};
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: 600;
`;

const Description = styled.p`
  color: ${props => props.theme.colors.neutral[600]};
  margin-bottom: 2rem;
  line-height: 1.6;
`;

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ data, onComplete }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationData['personalInfo']>({
    defaultValues: data,
  });

  const onSubmit = (formData: ApplicationData['personalInfo']) => {
    onComplete(formData);
  };

  return (
    <StepContainer>
      <Title>Personal Information</Title>
      <Description>
        Please provide your basic information. This will help us contact you about your application.
      </Description>

      <form id='step-1-form' onSubmit={handleSubmit(onSubmit)}>
        <FormGrid>
          <Input
            label='First Name'
            {...register('firstName', {
              required: 'First name is required',
              minLength: { value: 2, message: 'First name must be at least 2 characters' },
            })}
            error={errors.firstName?.message}
            required
          />

          <Input
            label='Last Name'
            {...register('lastName', {
              required: 'Last name is required',
              minLength: { value: 2, message: 'Last name must be at least 2 characters' },
            })}
            error={errors.lastName?.message}
            required
          />

          <Input
            label='Email Address'
            type='email'
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email address',
              },
            })}
            error={errors.email?.message}
            required
          />

          <Input
            label='Phone Number'
            type='tel'
            {...register('phone', {
              required: 'Phone number is required',
              pattern: {
                value: /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
                message: 'Please enter a valid phone number',
              },
            })}
            error={errors.phone?.message}
            required
          />

          <FullWidthField>
            <Input
              label='Street Address'
              {...register('address', {
                required: 'Address is required',
                minLength: { value: 5, message: 'Address must be at least 5 characters' },
              })}
              error={errors.address?.message}
              required
            />
          </FullWidthField>

          <Input
            label='City'
            {...register('city', {
              required: 'City is required',
              minLength: { value: 2, message: 'City must be at least 2 characters' },
            })}
            error={errors.city?.message}
            required
          />

          <Input
            label='State'
            {...register('state', {
              required: 'State is required',
              minLength: { value: 2, message: 'State must be at least 2 characters' },
            })}
            error={errors.state?.message}
            required
          />

          <Input
            label='ZIP Code'
            {...register('zipCode', {
              required: 'ZIP code is required',
              pattern: {
                value: /^[0-9]{5}(-[0-9]{4})?$/,
                message: 'Please enter a valid ZIP code',
              },
            })}
            error={errors.zipCode?.message}
            required
          />

          <Input
            label='Date of Birth'
            type='date'
            {...register('dateOfBirth')}
            error={errors.dateOfBirth?.message}
          />

          <Input
            label='Occupation'
            {...register('occupation')}
            error={errors.occupation?.message}
          />
        </FormGrid>
      </form>
    </StepContainer>
  );
};
