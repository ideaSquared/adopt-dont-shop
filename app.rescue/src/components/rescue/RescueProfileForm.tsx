import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Button,
  Card,
  TextInput,
  SelectInput,
  TextArea as LibTextArea,
  Alert,
  type SelectOption,
} from '@adopt-dont-shop/components';
import type { RescueProfile, RescueAddress } from '../../types/rescue';

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

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

interface RescueProfileFormProps {
  rescue: RescueProfile | null;
  onSave: (profile: Partial<RescueProfile>) => Promise<void>;
  loading?: boolean;
}

// SelectOption arrays for dropdowns
const rescueTypeOptions: SelectOption[] = [
  { value: 'animal_shelter', label: 'Animal Shelter' },
  { value: 'rescue_organization', label: 'Rescue Organisation' },
  { value: 'foster_network', label: 'Foster Network' },
  { value: 'breed_specific', label: 'Breed-Specific Rescue' },
  { value: 'sanctuary', label: 'Animal Sanctuary' },
  { value: 'other', label: 'Other' },
];

const countryOptions: SelectOption[] = [
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Ireland', label: 'Ireland' },
  { value: 'United States', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Other', label: 'Other' },
];

const RescueProfileForm: React.FC<RescueProfileFormProps> = ({
  rescue,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState<Partial<RescueProfile>>({
    name: '',
    rescue_type: 'animal_shelter',
    email: '',
    phone: '',
    website: '',
    description: '',
    address: {
      street: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom',
    },
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (rescue) {
      setFormData({
        name: rescue.name || '',
        rescue_type: rescue.rescue_type || 'animal_shelter',
        email: rescue.email || '',
        phone: rescue.phone || '',
        website: rescue.website || '',
        description: rescue.description || '',
        address: rescue.address || {
          street: '',
          city: '',
          county: '',
          postcode: '',
          country: 'United Kingdom',
        },
      });
    }
  }, [rescue]);

  const handleChange = (field: keyof RescueProfile | string, value: any) => {
    setHasChanges(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (field.startsWith('')) {
      const addressField = field.split('.')[1] as keyof RescueAddress;
      setFormData(prev => ({
        ...prev,
        address: {
          ...(prev.address || {}),
          [addressField]: value,
        } as RescueAddress,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await onSave(formData);
      setSuccessMessage('Rescue profile updated successfully!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving rescue profile:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save rescue profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (rescue) {
      setFormData({
        name: rescue.name || '',
        rescue_type: rescue.rescue_type || 'animal_shelter',
        email: rescue.email || '',
        phone: rescue.phone || '',
        website: rescue.website || '',
        description: rescue.description || '',
        address: rescue.address || {
          street: '',
          city: '',
          county: '',
          postcode: '',
          country: 'United Kingdom',
        },
      });
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
          <SectionTitle>Basic Information</SectionTitle>
          <FormRow>
            <FormGroup>
              <TextInput
                label="Rescue Name *"
                value={formData.name || ''}
                onChange={e => handleChange('name', e.target.value)}
                required
                placeholder="Enter rescue organisation name"
                fullWidth
              />
            </FormGroup>

            <FormGroup>
              <SelectInput
                label="Rescue Type *"
                value={formData.rescue_type || 'animal_shelter'}
                onChange={value => handleChange('rescue_type', value)}
                options={rescueTypeOptions}
                required
                fullWidth
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <TextInput
                label="Email Address *"
                type="email"
                value={formData.email || ''}
                onChange={e => handleChange('email', e.target.value)}
                required
                placeholder="contact@rescue.org.uk"
                helperText="Primary contact email for your rescue"
                fullWidth
              />
            </FormGroup>

            <FormGroup>
              <TextInput
                label="Phone Number *"
                type="tel"
                value={formData.phone || ''}
                onChange={e => handleChange('phone', e.target.value)}
                required
                placeholder="(555) 123-4567"
                helperText="Main phone number for enquiries"
                fullWidth
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <TextInput
                label="Website"
                type="url"
                value={formData.website || ''}
                onChange={e => handleChange('website', e.target.value)}
                placeholder="https://www.rescue.org.uk"
                fullWidth
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup style={{ gridColumn: '1 / -1' }}>
              <LibTextArea
                label="Description"
                value={formData.description || ''}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Tell adopters about your rescue organisation..."
                rows={4}
                helperText="This description will be visible to potential adopters"
                fullWidth
              />
            </FormGroup>
          </FormRow>
        </FormSection>

        <FormSection>
          <SectionTitle>Location</SectionTitle>
          <FormRow>
            <FormGroup style={{ gridColumn: '1 / -1' }}>
              <TextInput
                label="Street Address *"
                value={formData.address?.street || ''}
                onChange={e => handleChange('street', e.target.value)}
                required
                placeholder="123 High Street"
                fullWidth
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <TextInput
                label="Town/City *"
                value={formData.address?.city || ''}
                onChange={e => handleChange('city', e.target.value)}
                required
                placeholder="London"
                fullWidth
              />
            </FormGroup>

            <FormGroup>
              <TextInput
                label="County"
                value={formData.address?.county || ''}
                onChange={e => handleChange('address.county', e.target.value)}
                placeholder="Greater London"
                fullWidth
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <TextInput
                label="Postcode *"
                value={formData.address?.postcode || ''}
                onChange={e => handleChange('address.postcode', e.target.value.toUpperCase())}
                required
                placeholder="SW1A 1AA"
                fullWidth
              />
            </FormGroup>

            <FormGroup>
              <SelectInput
                label="Country *"
                value={formData.address?.country || 'United Kingdom'}
                onChange={value => handleChange('country', value)}
                options={countryOptions}
                required
                fullWidth
              />
            </FormGroup>
          </FormRow>
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
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </ButtonGroup>
      </form>
    </FormContainer>
  );
};

export default RescueProfileForm;
