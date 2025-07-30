import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  Button,
  Card,
  Text,
  Heading,
  TextInput,
  TextArea,
  SelectInput,
  CheckboxInput,
} from '@adopt-dont-shop/components';
import type { Pet } from '@adopt-dont-shop/lib-pets';

// TODO: Define CreatePetRequest and UpdatePetRequest in lib.pets
interface CreatePetRequest {
  name: string;
  type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
  breed?: string;
  age_years?: number;
  age_months?: number;
  size?: 'small' | 'medium' | 'large' | 'extra_large';
  gender?: 'male' | 'female';
  spay_neuter_status?: 'unknown' | 'intact' | 'spayed' | 'neutered';
  long_description?: string;
  medical_notes?: string;
  behavioral_notes?: string;
  adoption_fee?: string;
  microchip_id?: string;
  intake_date?: string;
  [key: string]: any;
}

interface UpdatePetRequest extends Partial<CreatePetRequest> {
  petId: string;
}

const FormContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const FormSection = styled.div`
  margin-bottom: 2rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const FullWidthGroup = styled(FormGroup)`
  grid-column: 1 / -1;
`;

const AgeContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

const PhotoUploadSection = styled.div`
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  background-color: #f9fafb;
`;

interface PetFormProps {
  pet?: Pet;
  onSubmit: (data: CreatePetRequest | UpdatePetRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PetForm: React.FC<PetFormProps> = ({ pet, onSubmit, onCancel, isLoading = false }) => {
  // Form state
  const [formData, setFormData] = useState<CreatePetRequest>({
    name: pet?.name || '',
    type: pet?.type || 'dog',
    breed: pet?.breed || '',
    age_years: pet?.age_years || 0,
    age_months: pet?.age_months || 0,
    size: pet?.size || 'medium',
    gender: pet?.gender || 'male',
    spay_neuter_status: pet?.spay_neuter_status || 'unknown',
    long_description: pet?.long_description || '',
    medical_notes: pet?.medical_notes || '',
    behavioral_notes: pet?.behavioral_notes || '',
    adoption_fee: pet?.adoption_fee || '',
    microchip_id: pet?.microchip_id || '',
    intake_date: pet?.intake_date || new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Pet name is required';
    }

    if (!formData.species) {
      newErrors.species = 'Species is required';
    }

    if (!formData.size) {
      newErrors.size = 'Size is required';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.intake_date) {
      newErrors.intake_date = 'Intake date is required';
    }

    if (formData.adoption_fee && parseFloat(formData.adoption_fee) < 0) {
      newErrors.adoption_fee = 'Adoption fee cannot be negative';
    }

    if (formData.age_years && formData.age_years < 0) {
      newErrors.age_years = 'Age cannot be negative';
    }

    if (formData.age_months && (formData.age_months < 0 || formData.age_months > 11)) {
      newErrors.age_months = 'Months must be between 0-11';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  // Handle input changes
  const handleTextInputChange =
    (field: keyof CreatePetRequest) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

  const handleTextAreaChange =
    (field: keyof CreatePetRequest) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

  const handleSelectChange = (field: keyof CreatePetRequest) => (value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user makes selection
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNumberInputChange =
    (field: keyof CreatePetRequest) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const numValue = value ? parseFloat(value) : 0;
      setFormData(prev => ({ ...prev, [field]: numValue }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

  const handleCheckboxChange =
    (field: keyof CreatePetRequest) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setFormData(prev => ({ ...prev, [field]: checked }));
    };

  return (
    <FormContainer>
      <Card>
        <Heading level='h2' style={{ marginBottom: '1.5rem' }}>
          {pet ? 'Edit Pet' : 'Add New Pet'}
        </Heading>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <FormSection>
            <Heading level='h3' style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
              Basic Information
            </Heading>

            <FormGrid>
              <FormGroup>
                <TextInput
                  label='Pet Name'
                  value={formData.name}
                  onChange={handleTextInputChange('name')}
                  error={errors.name}
                  required
                  placeholder="Enter pet's name"
                />
              </FormGroup>

              <FormGroup>
                <SelectInput
                  label='Species'
                  value={formData.species}
                  onChange={handleSelectChange('species')}
                  error={errors.species}
                  required
                  options={[
                    { value: 'DOG', label: 'Dog' },
                    { value: 'CAT', label: 'Cat' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />
              </FormGroup>

              <FormGroup>
                <TextInput
                  label='Breed'
                  value={formData.breed || ''}
                  onChange={handleTextInputChange('breed')}
                  placeholder='Enter breed (optional)'
                />
              </FormGroup>

              <FormGroup>
                <SelectInput
                  label='Size'
                  value={formData.size}
                  onChange={handleSelectChange('size')}
                  error={errors.size}
                  required
                  options={[
                    { value: 'SMALL', label: 'Small (under 25 lbs)' },
                    { value: 'MEDIUM', label: 'Medium (25-60 lbs)' },
                    { value: 'LARGE', label: 'Large (60-100 lbs)' },
                    { value: 'EXTRA_LARGE', label: 'Extra Large (over 100 lbs)' },
                  ]}
                />
              </FormGroup>

              <FormGroup>
                <SelectInput
                  label='Gender'
                  value={formData.gender}
                  onChange={handleSelectChange('gender')}
                  error={errors.gender}
                  required
                  options={[
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                    { value: 'UNKNOWN', label: 'Unknown' },
                  ]}
                />
              </FormGroup>

              <FormGroup>
                <Text style={{ marginBottom: '0.5rem', fontWeight: '500' }}>Age</Text>
                <AgeContainer>
                  <TextInput
                    label='Years'
                    type='number'
                    value={formData.age_years?.toString() || '0'}
                    onChange={handleNumberInputChange('age_years')}
                    error={errors.age_years}
                    placeholder='0'
                    min='0'
                  />
                  <TextInput
                    label='Months'
                    type='number'
                    value={formData.age_months?.toString() || '0'}
                    onChange={handleNumberInputChange('age_months')}
                    error={errors.age_months}
                    placeholder='0'
                    min='0'
                    max='11'
                  />
                </AgeContainer>
              </FormGroup>
            </FormGrid>
          </FormSection>

          {/* Medical & Behavior Information */}
          <FormSection>
            <Heading level='h3' style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
              Medical & Behavior
            </Heading>

            <FormGrid>
              <FormGroup>
                <CheckboxInput
                  label='Spayed/Neutered'
                  checked={formData.neutered_spayed}
                  onChange={handleCheckboxChange('neutered_spayed')}
                />
              </FormGroup>

              <FormGroup>
                <TextInput
                  label='Microchip ID'
                  value={formData.microchip_id || ''}
                  onChange={handleTextInputChange('microchip_id')}
                  placeholder='Enter microchip ID (optional)'
                />
              </FormGroup>

              <FullWidthGroup>
                <TextArea
                  label='Medical Notes'
                  value={formData.medical_notes || ''}
                  onChange={handleTextAreaChange('medical_notes')}
                  placeholder='Any medical conditions, treatments, or special needs...'
                  rows={3}
                />
              </FullWidthGroup>

              <FullWidthGroup>
                <TextArea
                  label='Behavioral Notes'
                  value={formData.behavioral_notes || ''}
                  onChange={handleTextAreaChange('behavioral_notes')}
                  placeholder='Personality traits, behavioral notes, training status...'
                  rows={3}
                />
              </FullWidthGroup>
            </FormGrid>
          </FormSection>

          {/* Administrative Information */}
          <FormSection>
            <Heading level='h3' style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
              Administrative
            </Heading>

            <FormGrid>
              <FormGroup>
                <TextInput
                  label='Intake Date'
                  type='date'
                  value={formData.intake_date}
                  onChange={handleTextInputChange('intake_date')}
                  error={errors.intake_date}
                  required
                />
              </FormGroup>

              <FormGroup>
                <TextInput
                  label='Adoption Fee ($)'
                  type='number'
                  value={formData.adoption_fee?.toString() || '0'}
                  onChange={handleNumberInputChange('adoption_fee')}
                  error={errors.adoption_fee}
                  placeholder='0.00'
                  min='0'
                  step='0.01'
                />
              </FormGroup>

              <FullWidthGroup>
                <TextInput
                  label='Current Location'
                  value={formData.location || ''}
                  onChange={handleTextInputChange('location')}
                  placeholder='Foster home, shelter, etc.'
                />
              </FullWidthGroup>

              <FullWidthGroup>
                <TextArea
                  label='Description'
                  value={formData.description || ''}
                  onChange={handleTextAreaChange('description')}
                  placeholder='A brief description of the pet for potential adopters...'
                  rows={4}
                />
              </FullWidthGroup>
            </FormGrid>
          </FormSection>

          {/* Photo Upload Section - Simplified for now */}
          <FormSection>
            <Heading level='h3' style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
              Photos
            </Heading>

            <PhotoUploadSection>
              <Text style={{ marginBottom: '1rem', color: '#6b7280' }}>
                Photo upload functionality will be available soon
              </Text>
              <Text style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                For now, photos can be added after creating the pet profile
              </Text>
            </PhotoUploadSection>
          </FormSection>

          {/* Form Actions */}
          <ButtonContainer>
            <Button type='button' variant='secondary' onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type='submit' variant='primary' disabled={isLoading}>
              {isLoading ? 'Saving...' : pet ? 'Update Pet' : 'Add Pet'}
            </Button>
          </ButtonContainer>
        </form>
      </Card>
    </FormContainer>
  );
};
