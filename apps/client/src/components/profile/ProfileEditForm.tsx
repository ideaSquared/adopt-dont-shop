import { User } from '@/services';
import {
  Button,
  ConfirmDialog,
  FormField,
  Input,
  SelectInput,
  TextArea,
  useConfirm,
} from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import * as styles from './ProfileEditForm.css';

interface ProfileEditFormProps {
  user: User;
  onSave: (updatedUser: Partial<User>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// ADS-C3: schema-first validation. Mirrors the previous inline rules (including
// the UK-postcode check that replaced the old US ZIP pattern) so behaviour is
// preserved, but is now a single Zod source of truth.
const ProfileFormSchema = z.object({
  firstName: z.string().refine(v => v.trim().length > 0, 'First name is required'),
  lastName: z.string().refine(v => v.trim().length > 0, 'Last name is required'),
  email: z
    .string()
    .refine(v => v.trim().length > 0, 'Email is required')
    .refine(
      v => v.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      'Please enter a valid email address'
    ),
  phone: z
    .string()
    .refine(v => v.length === 0 || /^\+?[\d\s\-()]+$/.test(v), 'Please enter a valid phone number'),
  bio: z.string().max(500, 'Bio must be 500 characters or less'),
  zipCode: z
    .string()
    .refine(
      v => v.length === 0 || /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i.test(v),
      'Please enter a valid UK postcode'
    ),
});

const collectErrors = (error: z.ZodError): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!(key in result)) {
      result[key] = issue.message;
    }
  }
  return result;
};

const contactMethodOptions = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'both', label: 'Both' },
];

const countryOptions = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
];

const singleValue = (value: string | string[]): string =>
  Array.isArray(value) ? (value[0] ?? '') : value;

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
  const { confirm, confirmProps } = useConfirm();

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

    // Clear error when the user edits the field (keyed by the schema field name).
    const errorKey = field.startsWith('location.') ? field.split('.')[1] : field;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = ProfileFormSchema.safeParse({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      bio: formData.bio,
      zipCode: formData.location.zipCode,
    });

    if (!parsed.success) {
      setErrors(collectErrors(parsed.error));
      return;
    }

    setErrors({});

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

  const handleCancel = async () => {
    if (hasChanges) {
      const confirmCancel = await confirm({
        title: 'Discard changes?',
        message: 'You have unsaved changes. Are you sure you want to cancel?',
        confirmText: 'Discard changes',
        cancelText: 'Keep editing',
        variant: 'warning',
      });
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

  const stateOptions = [
    { value: '', label: 'Select State' },
    ...usStates.map(state => ({ value: state, label: state })),
  ];

  return (
    <form id='profile-edit-form' className={styles.form} onSubmit={handleSubmit} noValidate>
      <h3 className={styles.formTitle}>
        Edit Profile
        {hasChanges && <span className={styles.unsavedBadge}>Unsaved changes</span>}
      </h3>

      <div className={styles.formRow}>
        <FormField label='First Name' htmlFor='firstName' required error={errors.firstName}>
          <Input
            id='firstName'
            type='text'
            value={formData.firstName}
            onChange={e => handleInputChange('firstName', e.target.value)}
            aria-invalid={!!errors.firstName}
            disabled={isLoading}
          />
        </FormField>

        <FormField label='Last Name' htmlFor='lastName' required error={errors.lastName}>
          <Input
            id='lastName'
            type='text'
            value={formData.lastName}
            onChange={e => handleInputChange('lastName', e.target.value)}
            aria-invalid={!!errors.lastName}
            disabled={isLoading}
          />
        </FormField>
      </div>

      <div className={styles.formRow}>
        <FormField label='Email' htmlFor='email' required error={errors.email}>
          <Input
            id='email'
            type='email'
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            aria-invalid={!!errors.email}
            disabled={isLoading}
          />
        </FormField>

        <FormField label='Phone Number' htmlFor='phone' error={errors.phone}>
          <Input
            id='phone'
            type='tel'
            value={formData.phone}
            onChange={e => handleInputChange('phone', e.target.value)}
            aria-invalid={!!errors.phone}
            disabled={isLoading}
            placeholder='07123 456789'
          />
        </FormField>
      </div>

      <div className={styles.formGroup}>
        <SelectInput
          label='Preferred Contact Method'
          value={formData.preferredContactMethod}
          onChange={value => handleInputChange('preferredContactMethod', singleValue(value))}
          options={contactMethodOptions}
          disabled={isLoading}
          fullWidth
        />
      </div>

      <FormField label='Bio' htmlFor='bio' error={errors.bio}>
        <TextArea
          id='bio'
          value={formData.bio}
          onChange={e => handleInputChange('bio', e.target.value)}
          aria-invalid={!!errors.bio}
          disabled={isLoading}
          placeholder='Tell us a little about yourself...'
          rows={4}
          maxLength={500}
        />
        <div className={styles.characterCount({ isNearLimit: formData.bio.length > 400 })}>
          {formData.bio.length}/500 characters
        </div>
      </FormField>

      <FormField label='Address' htmlFor='address'>
        <Input
          id='address'
          type='text'
          value={formData.location.address}
          onChange={e => handleInputChange('location.address', e.target.value)}
          disabled={isLoading}
          placeholder='123 Main Street'
        />
      </FormField>

      <div className={styles.formRow}>
        <FormField label='City' htmlFor='city'>
          <Input
            id='city'
            type='text'
            value={formData.location.city}
            onChange={e => handleInputChange('location.city', e.target.value)}
            disabled={isLoading}
            placeholder='San Francisco'
          />
        </FormField>

        <div className={styles.formGroup}>
          <SelectInput
            label='State'
            value={formData.location.state}
            onChange={value => handleInputChange('location.state', singleValue(value))}
            options={stateOptions}
            disabled={isLoading}
            fullWidth
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <FormField label='ZIP Code' htmlFor='zipCode' error={errors.zipCode}>
          <Input
            id='zipCode'
            type='text'
            value={formData.location.zipCode}
            onChange={e => handleInputChange('location.zipCode', e.target.value)}
            aria-invalid={!!errors.zipCode}
            disabled={isLoading}
            placeholder='12345'
          />
        </FormField>

        <div className={styles.formGroup}>
          <SelectInput
            label='Country'
            value={formData.location.country}
            onChange={value => handleInputChange('location.country', singleValue(value))}
            options={countryOptions}
            disabled={isLoading}
            fullWidth
          />
        </div>
      </div>

      {errors.submit && <div className={styles.submitError}>{errors.submit}</div>}

      <div className={styles.buttonGroup}>
        <Button type='button' variant='secondary' onClick={handleCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type='submit' isLoading={isLoading} disabled={isLoading}>
          Save Changes
        </Button>
      </div>

      <div className={styles.keyboardHint}>
        💡 Tip: Press Ctrl+S (or ⌘+S on Mac) to save quickly
      </div>

      <ConfirmDialog {...confirmProps} />
    </form>
  );
};

export default ProfileEditForm;
