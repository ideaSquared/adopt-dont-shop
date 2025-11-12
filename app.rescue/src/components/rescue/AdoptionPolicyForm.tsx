import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Button,
  Card,
  TextInput,
  TextArea as LibTextArea,
  Alert,
  CheckboxInput,
} from '@adopt-dont-shop/components';
import type { AdoptionPolicy } from '../../types/rescue';

const FormContainer = styled(Card)`
  padding: 2rem;
  margin-bottom: 2rem;
`;

const FormSection = styled.div`
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ListInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ListItem = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ListItemInput = styled.input`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const RemoveButton = styled.button`
  padding: 0.5rem 0.75rem;
  background-color: #fee2e2;
  color: #991b1b;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #fecaca;
  }
`;

const AddButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #dbeafe;
  color: #1e40af;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #bfdbfe;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

const CheckboxWrapper = styled.div`
  margin-bottom: 0.75rem;
`;

interface AdoptionPolicyFormProps {
  policy: AdoptionPolicy | null;
  onSave: (policy: AdoptionPolicy) => Promise<void>;
  loading?: boolean;
}

const DEFAULT_POLICY: AdoptionPolicy = {
  requireHomeVisit: true,
  requireReferences: true,
  minimumReferenceCount: 2,
  requireVeterinarianReference: true,
  adoptionFeeRange: { min: 0, max: 500 },
  requirements: [],
  policies: [],
};

const AdoptionPolicyForm: React.FC<AdoptionPolicyFormProps> = ({
  policy,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState<AdoptionPolicy>(DEFAULT_POLICY);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    console.log('AdoptionPolicyForm received policy:', policy);
    if (policy) {
      console.log('Setting form data to:', policy);
      setFormData(policy);
    } else {
      console.log('No policy provided, using default');
      setFormData(DEFAULT_POLICY);
    }
  }, [policy]);

  const handleChange = (field: keyof AdoptionPolicy, value: any) => {
    setHasChanges(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFeeChange = (type: 'min' | 'max', value: string) => {
    setHasChanges(true);
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      adoptionFeeRange: {
        ...prev.adoptionFeeRange,
        [type]: numValue,
      },
    }));
  };

  const addListItem = (field: 'requirements' | 'policies') => {
    setHasChanges(true);
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const updateListItem = (field: 'requirements' | 'policies', index: number, value: string) => {
    setHasChanges(true);
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const removeListItem = (field: 'requirements' | 'policies', index: number) => {
    setHasChanges(true);
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // Filter out empty strings from lists
      const cleanedData = {
        ...formData,
        requirements: formData.requirements.filter(r => r.trim()),
        policies: formData.policies.filter(p => p.trim()),
      };

      await onSave(cleanedData);
      setSuccessMessage('Adoption policies updated successfully!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving adoption policies:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save adoption policies. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (policy) {
      setFormData(policy);
      setHasChanges(false);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  };

  return (
    <FormContainer>
      <form onSubmit={handleSubmit}>
        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <FormSection>
          <SectionTitle>Application Requirements</SectionTitle>

          <CheckboxWrapper>
            <CheckboxInput
              label="Require home visit for all adoptions"
              checked={formData.requireHomeVisit}
              onChange={e => handleChange('requireHomeVisit', e.target.checked)}
            />
          </CheckboxWrapper>

          <CheckboxWrapper>
            <CheckboxInput
              label="Require personal references"
              checked={formData.requireReferences}
              onChange={e => handleChange('requireReferences', e.target.checked)}
            />
          </CheckboxWrapper>

          {formData.requireReferences && (
            <FormRow>
              <FormGroup>
                <TextInput
                  label="Minimum Number of References"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.minimumReferenceCount.toString()}
                  onChange={e =>
                    handleChange('minimumReferenceCount', parseInt(e.target.value) || 0)
                  }
                  fullWidth
                />
              </FormGroup>

              <FormGroup>
                <CheckboxWrapper>
                  <CheckboxInput
                    label="Require veterinarian reference"
                    checked={formData.requireVeterinarianReference}
                    onChange={e => handleChange('requireVeterinarianReference', e.target.checked)}
                  />
                </CheckboxWrapper>
              </FormGroup>
            </FormRow>
          )}
        </FormSection>

        <FormSection>
          <SectionTitle>Adoption Fees</SectionTitle>
          <FormRow>
            <FormGroup>
              <TextInput
                label="Minimum Fee (£)"
                type="number"
                min={0}
                step={0.01}
                value={formData.adoptionFeeRange.min.toString()}
                onChange={e => handleFeeChange('min', e.target.value)}
                fullWidth
              />
            </FormGroup>

            <FormGroup>
              <TextInput
                label="Maximum Fee (£)"
                type="number"
                min={0}
                step={0.01}
                value={formData.adoptionFeeRange.max.toString()}
                onChange={e => handleFeeChange('max', e.target.value)}
                helperText="Set the range for your adoption fees"
                fullWidth
              />
            </FormGroup>
          </FormRow>
        </FormSection>

        <FormSection>
          <SectionTitle>Adoption Requirements</SectionTitle>
          <ListInput>
            {formData.requirements.map((req, index) => (
              <ListItem key={index}>
                <ListItemInput
                  type="text"
                  value={req}
                  onChange={e => updateListItem('requirements', index, e.target.value)}
                  placeholder="e.g., Must be 21 years or older"
                />
                <RemoveButton type="button" onClick={() => removeListItem('requirements', index)}>
                  Remove
                </RemoveButton>
              </ListItem>
            ))}
            <AddButton type="button" onClick={() => addListItem('requirements')}>
              + Add Requirement
            </AddButton>
          </ListInput>
        </FormSection>

        <FormSection>
          <SectionTitle>Policies</SectionTitle>
          <ListInput>
            {formData.policies.map((policy, index) => (
              <ListItem key={index}>
                <ListItemInput
                  type="text"
                  value={policy}
                  onChange={e => updateListItem('policies', index, e.target.value)}
                  placeholder="e.g., All pets must be spayed/neutered"
                />
                <RemoveButton type="button" onClick={() => removeListItem('policies', index)}>
                  Remove
                </RemoveButton>
              </ListItem>
            ))}
            <AddButton type="button" onClick={() => addListItem('policies')}>
              + Add Policy
            </AddButton>
          </ListInput>
        </FormSection>

        <FormSection>
          <SectionTitle>Additional Policies</SectionTitle>
          <FormGroup>
            <LibTextArea
              label="Return Policy"
              value={formData.returnPolicy || ''}
              onChange={e => handleChange('returnPolicy', e.target.value)}
              placeholder="Describe your policy for returning adopted pets..."
              fullWidth
            />
          </FormGroup>

          <FormGroup>
            <LibTextArea
              label="Spay/Neuter Policy"
              value={formData.spayNeuterPolicy || ''}
              onChange={e => handleChange('spayNeuterPolicy', e.target.value)}
              placeholder="Describe your spay/neuter requirements..."
              fullWidth
            />
          </FormGroup>

          <FormGroup>
            <LibTextArea
              label="Follow-up Policy"
              value={formData.followUpPolicy || ''}
              onChange={e => handleChange('followUpPolicy', e.target.value)}
              placeholder="Describe your follow-up procedures after adoption..."
              fullWidth
            />
          </FormGroup>
        </FormSection>

        <ButtonGroup>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || saving || loading}
          >
            Reset
          </Button>
          <Button type="submit" variant="primary" disabled={!hasChanges || saving || loading}>
            {saving ? 'Saving...' : 'Save Policies'}
          </Button>
        </ButtonGroup>
      </form>
    </FormContainer>
  );
};

export default AdoptionPolicyForm;
