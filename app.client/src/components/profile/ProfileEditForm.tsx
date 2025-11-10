import { User } from '@/services';
import { Button, Input, TextArea } from '@adopt-dont-shop/components';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: ${props => props.theme.text.primary};
  font-size: 0.875rem;
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 8px;
  background: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const FormTitle = styled.h3`
  font-size: 1.25rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UnsavedBadge = styled.span`
  background: ${props => props.theme.colors.semantic?.warning?.[100] || '#fef3c7'};
  color: ${props => props.theme.colors.semantic?.warning?.[700] || '#92400e'};
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const KeyboardHint = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.text.secondary};
  text-align: center;
  margin-top: 0.5rem;
  opacity: 0.7;
`;

const CharacterCount = styled.div<{ $isNearLimit: boolean }>`
  font-size: 0.75rem;
  color: ${props =>
    props.$isNearLimit
      ? props.theme.colors.semantic?.warning?.[600] || '#d97706'
      : props.theme.text.secondary};
  text-align: right;
  margin-top: 0.25rem;
`;

interface ProfileEditFormProps {
  user: User;
  onSave: (updatedUser: Partial<User>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  user,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || user.phoneNumber || '',
    preferredContactMethod: user.preferredContactMethod || 'email',
    bio: user.bio || '',
    location: {
      address: user.location?.address || user.addressLine1 || '',
      city: user.location?.city || user.city || '',
      state: user.location?.state || '',
      zipCode: user.location?.zipCode || user.postalCode || '',
      country: user.location?.country || user.country || 'US',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Handle Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isLoading && hasChanges) {
          document
            .getElementById('profile-edit-form')
            ?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, hasChanges]);

  const handleInputChange = (field: string, value: string) => {
    setHasChanges(true);

    if (field.startsWith('location.')) {
      const locationField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^\+?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.location.zipCode && !/^\d{5}(-\d{4})?$/.test(formData.location.zipCode)) {
      newErrors['location.zipCode'] = 'Please enter a valid ZIP code';
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Transform formData to match User interface
      const userData: Partial<User> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        phoneNumber: formData.phone, // Support both fields
        preferredContactMethod: formData.preferredContactMethod,
        bio: formData.bio,
        // Map location fields to both new and legacy formats
        location: {
          type: 'Point', // Default GeoJSON type
          coordinates: [0, 0], // Default coordinates
          address: formData.location.address,
          city: formData.location.city,
          state: formData.location.state,
          zipCode: formData.location.zipCode,
          country: formData.location.country,
        },
        // Legacy field mappings
        addressLine1: formData.location.address,
        city: formData.location.city,
        postalCode: formData.location.zipCode,
        country: formData.location.country,
      };

      await onSave(userData);
      setHasChanges(false); // Reset changes indicator after successful save
    } catch (error) {
      console.error('Failed to save profile:', error);
      setErrors({ submit: 'Failed to save profile. Please try again.' });
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmCancel = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmCancel) {
        return;
      }
    }
    onCancel();
  };

  const usStates = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
  ];

  return (
    <Form id='profile-edit-form' onSubmit={handleSubmit}>
      <FormTitle>
        Edit Profile
        {hasChanges && <UnsavedBadge>Unsaved changes</UnsavedBadge>}
      </FormTitle>

      <FormRow>
        <FormGroup>
          <Label htmlFor='firstName'>First Name *</Label>
          <Input
            id='firstName'
            type='text'
            value={formData.firstName}
            onChange={e => handleInputChange('firstName', e.target.value)}
            error={errors.firstName}
            disabled={isLoading}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor='lastName'>Last Name *</Label>
          <Input
            id='lastName'
            type='text'
            value={formData.lastName}
            onChange={e => handleInputChange('lastName', e.target.value)}
            error={errors.lastName}
            disabled={isLoading}
          />
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label htmlFor='email'>Email *</Label>
          <Input
            id='email'
            type='email'
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            error={errors.email}
            disabled={isLoading}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor='phone'>Phone Number</Label>
          <Input
            id='phone'
            type='tel'
            value={formData.phone}
            onChange={e => handleInputChange('phone', e.target.value)}
            error={errors.phone}
            disabled={isLoading}
            placeholder='(555) 123-4567'
          />
        </FormGroup>
      </FormRow>

      <FormGroup>
        <Label htmlFor='preferredContactMethod'>Preferred Contact Method</Label>
        <Select
          id='preferredContactMethod'
          value={formData.preferredContactMethod}
          onChange={e => handleInputChange('preferredContactMethod', e.target.value)}
          disabled={isLoading}
        >
          <option value='email'>Email</option>
          <option value='phone'>Phone</option>
          <option value='both'>Both</option>
        </Select>
      </FormGroup>

      <FormGroup>
        <Label htmlFor='bio'>Bio</Label>
        <TextArea
          id='bio'
          value={formData.bio}
          onChange={e => handleInputChange('bio', e.target.value)}
          error={errors.bio}
          disabled={isLoading}
          placeholder='Tell us a little about yourself...'
          rows={4}
          maxLength={500}
        />
        <CharacterCount $isNearLimit={formData.bio.length > 400}>
          {formData.bio.length}/500 characters
        </CharacterCount>
      </FormGroup>

      <FormGroup>
        <Label htmlFor='address'>Address</Label>
        <Input
          id='address'
          type='text'
          value={formData.location.address}
          onChange={e => handleInputChange('location.address', e.target.value)}
          disabled={isLoading}
          placeholder='123 Main Street'
        />
      </FormGroup>

      <FormRow>
        <FormGroup>
          <Label htmlFor='city'>City</Label>
          <Input
            id='city'
            type='text'
            value={formData.location.city}
            onChange={e => handleInputChange('location.city', e.target.value)}
            disabled={isLoading}
            placeholder='San Francisco'
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor='state'>State</Label>
          <Select
            id='state'
            value={formData.location.state}
            onChange={e => handleInputChange('location.state', e.target.value)}
            disabled={isLoading}
          >
            <option value=''>Select State</option>
            {usStates.map(state => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>
        </FormGroup>
      </FormRow>

      <FormRow>
        <FormGroup>
          <Label htmlFor='zipCode'>ZIP Code</Label>
          <Input
            id='zipCode'
            type='text'
            value={formData.location.zipCode}
            onChange={e => handleInputChange('location.zipCode', e.target.value)}
            error={errors['location.zipCode']}
            disabled={isLoading}
            placeholder='12345'
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor='country'>Country</Label>
          <Select
            id='country'
            value={formData.location.country}
            onChange={e => handleInputChange('location.country', e.target.value)}
            disabled={isLoading}
          >
            <option value='US'>United States</option>
            <option value='CA'>Canada</option>
          </Select>
        </FormGroup>
      </FormRow>

      {errors.submit && <div style={{ color: 'red', fontSize: '0.875rem' }}>{errors.submit}</div>}

      <ButtonGroup>
        <Button type='button' variant='secondary' onClick={handleCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type='submit' isLoading={isLoading} disabled={isLoading}>
          Save Changes
        </Button>
      </ButtonGroup>

      <KeyboardHint>💡 Tip: Press Ctrl+S (or ⌘+S on Mac) to save quickly</KeyboardHint>
    </Form>
  );
};

export default ProfileEditForm;
