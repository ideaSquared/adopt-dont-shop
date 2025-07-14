import { ApplicationData } from '@/types';
import React, { useState } from 'react';
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

const FormSection = styled.div`
  border: 1px solid ${props => props.theme.border.color.secondary};
  border-radius: 8px;
  padding: 1.5rem;
  background: ${props => props.theme.background.secondary};
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 1rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  color: ${props => props.theme.text.primary};
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border.color.secondary};
  border-radius: 4px;
  background: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary[100]};
  }
`;

const ReferenceList = styled.div`
  border: 1px solid ${props => props.theme.border.color.secondary};
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
`;

const ReferenceItem = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.border.color.secondary};
  display: grid;
  grid-template-columns: 1.5fr 1fr 1.5fr 100px auto;
  gap: 1rem;
  align-items: center;

  &:last-child {
    border-bottom: none;
  }
`;

const AddButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.theme.colors.primary[500]};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background: ${props => props.theme.colors.primary[600]};
  }
`;

const RemoveButton = styled.button`
  padding: 0.25rem 0.5rem;
  background: ${props => props.theme.colors.semantic.error[500]};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;

  &:hover {
    background: ${props => props.theme.colors.semantic.error[600]};
  }
`;

export const ReferencesStep: React.FC<ReferencesStepProps> = ({ data, onComplete }) => {
  const [formData, setFormData] = useState<ApplicationData['references']>({
    veterinarian: data.veterinarian || {
      name: '',
      clinicName: '',
      phone: '',
      email: '',
      yearsUsed: 1,
    },
    personal: data.personal || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const addPersonalReference = () => {
    setFormData(prev => ({
      ...prev,
      personal: [
        ...prev.personal,
        {
          name: '',
          relationship: '',
          phone: '',
          email: '',
          yearsKnown: 1,
        },
      ],
    }));
  };

  const removePersonalReference = (index: number) => {
    setFormData(prev => ({
      ...prev,
      personal: prev.personal.filter((_, i) => i !== index),
    }));
  };

  const updatePersonalReference = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      personal: prev.personal.map((ref, i) => (i === index ? { ...ref, [field]: value } : ref)),
    }));
  };

  const updateVeterinarianReference = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      veterinarian: prev.veterinarian
        ? { ...prev.veterinarian, [field]: value }
        : {
            name: '',
            clinicName: '',
            phone: '',
            email: '',
            yearsUsed: 1,
            [field]: value,
          },
    }));
  };

  return (
    <StepContainer>
      <StepTitle>References</StepTitle>
      <StepDescription>
        Please provide contact information for references. This helps us ensure the best match for
        both you and the pet.
      </StepDescription>

      <Form id='step-4-form' onSubmit={handleSubmit}>
        {/* Veterinarian Reference Section */}
        <FormSection>
          <SectionTitle>Veterinarian Reference (if applicable)</SectionTitle>

          <FormGroup>
            <Label>Veterinarian Name</Label>
            <Input
              type='text'
              value={formData.veterinarian?.name || ''}
              onChange={e => updateVeterinarianReference('name', e.target.value)}
              placeholder='Dr. Smith'
            />
          </FormGroup>

          <FormGroup>
            <Label>Clinic Name</Label>
            <Input
              type='text'
              value={formData.veterinarian?.clinicName || ''}
              onChange={e => updateVeterinarianReference('clinicName', e.target.value)}
              placeholder='ABC Veterinary Clinic'
            />
          </FormGroup>

          <FormGroup>
            <Label>Phone Number</Label>
            <Input
              type='tel'
              value={formData.veterinarian?.phone || ''}
              onChange={e => updateVeterinarianReference('phone', e.target.value)}
              placeholder='01234 567890'
            />
          </FormGroup>

          <FormGroup>
            <Label>Email (optional)</Label>
            <Input
              type='email'
              value={formData.veterinarian?.email || ''}
              onChange={e => updateVeterinarianReference('email', e.target.value)}
              placeholder='vet@clinic.com'
            />
          </FormGroup>

          <FormGroup>
            <Label>Years Used</Label>
            <Input
              type='number'
              value={formData.veterinarian?.yearsUsed || 1}
              onChange={e =>
                updateVeterinarianReference('yearsUsed', parseInt(e.target.value) || 1)
              }
              min='0'
              max='50'
            />
          </FormGroup>
        </FormSection>

        {/* Personal References Section */}
        <FormSection>
          <SectionTitle>Personal References</SectionTitle>

          <FormGroup>
            <Label>Personal References (at least 2 required)</Label>
            {formData.personal.length > 0 && (
              <ReferenceList>
                <div
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#f5f5f5',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1fr 1.5fr 100px auto',
                      gap: '1rem',
                    }}
                  >
                    <span>Name</span>
                    <span>Relationship</span>
                    <span>Phone</span>
                    <span>Years Known</span>
                    <span></span>
                  </div>
                </div>
                {formData.personal.map((reference, index) => (
                  <ReferenceItem key={index}>
                    <Input
                      type='text'
                      value={reference.name}
                      onChange={e => updatePersonalReference(index, 'name', e.target.value)}
                      placeholder='Full Name'
                      style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                    />
                    <Input
                      type='text'
                      value={reference.relationship}
                      onChange={e => updatePersonalReference(index, 'relationship', e.target.value)}
                      placeholder='Friend, Colleague'
                      style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                    />
                    <Input
                      type='tel'
                      value={reference.phone}
                      onChange={e => updatePersonalReference(index, 'phone', e.target.value)}
                      placeholder='01234 567890'
                      style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                    />
                    <Input
                      type='number'
                      value={reference.yearsKnown}
                      onChange={e =>
                        updatePersonalReference(index, 'yearsKnown', parseInt(e.target.value) || 1)
                      }
                      min='0'
                      max='50'
                      style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                    />
                    <RemoveButton type='button' onClick={() => removePersonalReference(index)}>
                      Remove
                    </RemoveButton>
                  </ReferenceItem>
                ))}
              </ReferenceList>
            )}
            <div style={{ marginTop: '1rem' }}>
              <AddButton type='button' onClick={addPersonalReference}>
                Add Personal Reference
              </AddButton>
            </div>
          </FormGroup>
        </FormSection>
      </Form>
    </StepContainer>
  );
};
