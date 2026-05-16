import { User } from '@/services';
import {
  Button,
  ConfirmDialog,
  Input,
  TextArea,
  useConfirm,
} from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import * as styles from './ProfileEditForm.css';

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

  return (
    <form id='profile-edit-form' className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.formTitle}>
        Edit Profile
        {hasChanges && <span className={styles.unsavedBadge}>Unsaved changes</span>}
      </h3>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor='firstName' className={styles.label}>
            First Name *
          </label>
          <Input
            id='firstName'
            type='text'
            value={formData.firstName}
            onChange={e => handleInputChange('firstName', e.target.value)}
            error={errors.firstName}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor='lastName' className={styles.label}>
            Last Name *
          </label>
          <Input
            id='lastName'
            type='text'
            value={formData.lastName}
            onChange={e => handleInputChange('lastName', e.target.value)}
            error={errors.lastName}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor='email' className={styles.label}>
            Email *
          </label>
          <Input
            id='email'
            type='email'
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            error={errors.email}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor='phone' className={styles.label}>
            Phone Number
          </label>
          <Input
            id='phone'
            type='tel'
            value={formData.phone}
            onChange={e => handleInputChange('phone', e.target.value)}
            error={errors.phone}
            disabled={isLoading}
            placeholder='07123 456789'
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor='preferredContactMethod' className={styles.label}>
          Preferred Contact Method
        </label>
        <select
          id='preferredContactMethod'
          className={styles.select}
          value={formData.preferredContactMethod}
          onChange={e => handleInputChange('preferredContactMethod', e.target.value)}
          disabled={isLoading}
        >
          <option value='email'>Email</option>
          <option value='phone'>Phone</option>
          <option value='both'>Both</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor='bio' className={styles.label}>
          Bio
        </label>
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
        <div className={styles.characterCount({ isNearLimit: formData.bio.length > 400 })}>
          {formData.bio.length}/500 characters
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor='address' className={styles.label}>
          Address
        </label>
        <Input
          id='address'
          type='text'
          value={formData.location.address}
          onChange={e => handleInputChange('location.address', e.target.value)}
          disabled={isLoading}
          placeholder='123 Main Street'
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor='city' className={styles.label}>
            City
          </label>
          <Input
            id='city'
            type='text'
            value={formData.location.city}
            onChange={e => handleInputChange('location.city', e.target.value)}
            disabled={isLoading}
            placeholder='San Francisco'
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor='state' className={styles.label}>
            State
          </label>
          <select
            id='state'
            className={styles.select}
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
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor='zipCode' className={styles.label}>
            ZIP Code
          </label>
          <Input
            id='zipCode'
            type='text'
            value={formData.location.zipCode}
            onChange={e => handleInputChange('location.zipCode', e.target.value)}
            error={errors['location.zipCode']}
            disabled={isLoading}
            placeholder='12345'
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor='country' className={styles.label}>
            Country
          </label>
          <select
            id='country'
            className={styles.select}
            value={formData.location.country}
            onChange={e => handleInputChange('location.country', e.target.value)}
            disabled={isLoading}
          >
            <option value='US'>United States</option>
            <option value='CA'>Canada</option>
          </select>
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
