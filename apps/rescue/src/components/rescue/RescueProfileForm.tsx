import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Input,
  FormField,
  SelectInput,
  TextArea as LibTextArea,
  Alert,
  type SelectOption,
} from '@adopt-dont-shop/lib.components';
import { validatePostcode, validatePhoneNumber } from '@adopt-dont-shop/lib.utils';
import type { RescueProfile, RescueAddress } from '../../types/rescue';
import * as styles from './RescueProfileForm.css';

interface RescueProfileFormProps {
  rescue: RescueProfile | null;
  onSave: (profile: Partial<RescueProfile>) => Promise<void>;
  loading?: boolean;
}

type ProfileErrorField = 'name' | 'email' | 'phone' | 'website' | 'street' | 'city' | 'postcode';
type ProfileErrors = Partial<Record<ProfileErrorField, string>>;

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

const emptyAddress: RescueAddress = {
  street: '',
  city: '',
  county: '',
  postcode: '',
  country: 'United Kingdom',
};

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidWebsite = (value: string): boolean => /^https?:\/\/.+\..+/i.test(value.trim());

const validateProfile = (data: Partial<RescueProfile>): ProfileErrors => {
  const errors: ProfileErrors = {};
  const address = data.address ?? emptyAddress;

  if (!data.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!data.phone?.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!validatePhoneNumber(data.phone)) {
    errors.phone = 'Enter a valid UK phone number';
  }

  if (data.website?.trim() && !isValidWebsite(data.website)) {
    errors.website = 'Enter a valid URL (including https://)';
  }

  if (!address.street?.trim()) {
    errors.street = 'Street address is required';
  }

  if (!address.city?.trim()) {
    errors.city = 'Town/City is required';
  }

  if (!address.postcode?.trim()) {
    errors.postcode = 'Postcode is required';
  } else if (!validatePostcode(address.postcode)) {
    errors.postcode = 'Enter a valid UK postcode';
  }

  return errors;
};

const buildFormData = (rescue: RescueProfile | null): Partial<RescueProfile> => ({
  name: rescue?.name ?? '',
  rescue_type: rescue?.rescue_type ?? 'animal_shelter',
  email: rescue?.email ?? '',
  phone: rescue?.phone ?? '',
  website: rescue?.website ?? '',
  description: rescue?.description ?? '',
  address: rescue?.address ?? { ...emptyAddress },
});

const RescueProfileForm: React.FC<RescueProfileFormProps> = ({
  rescue,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState<Partial<RescueProfile>>(() => buildFormData(rescue));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (rescue) {
      setFormData(buildFormData(rescue));
      setHasChanges(false);
    }
  }, [rescue]);

  const clearFeedback = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleField = (
    field: 'name' | 'email' | 'phone' | 'website' | 'description',
    value: string
  ) => {
    setHasChanges(true);
    clearFeedback();
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field !== 'description' && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddressField = (field: keyof RescueAddress, value: string) => {
    setHasChanges(true);
    clearFeedback();
    setFormData(prev => ({
      ...prev,
      address: { ...(prev.address ?? emptyAddress), [field]: value },
    }));
    if ((field === 'street' || field === 'city' || field === 'postcode') && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSelect = (field: 'rescue_type' | 'country', selected: string | string[]) => {
    const value = Array.isArray(selected) ? (selected[0] ?? '') : selected;
    setHasChanges(true);
    clearFeedback();
    if (field === 'country') {
      setFormData(prev => ({
        ...prev,
        address: { ...(prev.address ?? emptyAddress), country: value },
      }));
      return;
    }
    setFormData(prev => ({ ...prev, rescue_type: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateProfile(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    clearFeedback();

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
      setFormData(buildFormData(rescue));
      setErrors({});
      setHasChanges(false);
      clearFeedback();
    }
  };

  return (
    <Card className={styles.formContainer}>
      <form onSubmit={handleSubmit} noValidate>
        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Basic Information</h3>
          <div className={styles.formRow}>
            <FormField label="Rescue Name" htmlFor="rescue-name" required error={errors.name}>
              <Input
                id="rescue-name"
                value={formData.name ?? ''}
                onChange={e => handleField('name', e.target.value)}
                placeholder="Enter rescue organisation name"
                aria-invalid={!!errors.name}
              />
            </FormField>

            <div className={styles.formGroup}>
              <SelectInput
                label="Rescue Type *"
                value={formData.rescue_type || 'animal_shelter'}
                onChange={value => handleSelect('rescue_type', value)}
                options={rescueTypeOptions}
                required
                fullWidth
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <FormField
              label="Email Address"
              htmlFor="rescue-email"
              required
              error={errors.email}
              description="Primary contact email for your rescue"
            >
              <Input
                id="rescue-email"
                type="email"
                value={formData.email ?? ''}
                onChange={e => handleField('email', e.target.value)}
                placeholder="contact@rescue.org.uk"
                aria-invalid={!!errors.email}
              />
            </FormField>

            <FormField
              label="Phone Number"
              htmlFor="rescue-phone"
              required
              error={errors.phone}
              description="Main phone number for enquiries"
            >
              <Input
                id="rescue-phone"
                type="tel"
                value={formData.phone ?? ''}
                onChange={e => handleField('phone', e.target.value)}
                placeholder="020 7946 0958"
                aria-invalid={!!errors.phone}
              />
            </FormField>
          </div>

          <div className={styles.formRow}>
            <FormField label="Website" htmlFor="rescue-website" error={errors.website}>
              <Input
                id="rescue-website"
                type="url"
                value={formData.website ?? ''}
                onChange={e => handleField('website', e.target.value)}
                placeholder="https://www.rescue.org.uk"
                aria-invalid={!!errors.website}
              />
            </FormField>
          </div>

          <div className={styles.formRow}>
            <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
              <LibTextArea
                label="Description"
                value={formData.description || ''}
                onChange={e => handleField('description', e.target.value)}
                placeholder="Tell adopters about your rescue organisation..."
                rows={4}
                helperText="This description will be visible to potential adopters"
                fullWidth
              />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>Location</h3>
          <div className={styles.formRow}>
            <FormField
              label="Street Address"
              htmlFor="rescue-street"
              required
              error={errors.street}
              className={styles.formGroupFullWidth}
            >
              <Input
                id="rescue-street"
                value={formData.address?.street ?? ''}
                onChange={e => handleAddressField('street', e.target.value)}
                placeholder="123 High Street"
                aria-invalid={!!errors.street}
              />
            </FormField>
          </div>

          <div className={styles.formRow}>
            <FormField label="Town/City" htmlFor="rescue-city" required error={errors.city}>
              <Input
                id="rescue-city"
                value={formData.address?.city ?? ''}
                onChange={e => handleAddressField('city', e.target.value)}
                placeholder="London"
                aria-invalid={!!errors.city}
              />
            </FormField>

            <FormField label="County" htmlFor="rescue-county">
              <Input
                id="rescue-county"
                value={formData.address?.county ?? ''}
                onChange={e => handleAddressField('county', e.target.value)}
                placeholder="Greater London"
              />
            </FormField>
          </div>

          <div className={styles.formRow}>
            <FormField label="Postcode" htmlFor="rescue-postcode" required error={errors.postcode}>
              <Input
                id="rescue-postcode"
                value={formData.address?.postcode ?? ''}
                onChange={e => handleAddressField('postcode', e.target.value.toUpperCase())}
                placeholder="SW1A 1AA"
                aria-invalid={!!errors.postcode}
              />
            </FormField>

            <div className={styles.formGroup}>
              <SelectInput
                label="Country *"
                value={formData.address?.country || 'United Kingdom'}
                onChange={value => handleSelect('country', value)}
                options={countryOptions}
                required
                fullWidth
              />
            </div>
          </div>
        </div>

        <div className={styles.buttonGroup}>
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
        </div>
      </form>
    </Card>
  );
};

export default RescueProfileForm;
