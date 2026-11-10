import React, { useState } from 'react';
import { Button, FormField, Input, Modal } from '@adopt-dont-shop/lib.components';
import { NewStaffMember, StaffMember } from '../../types/staff';
import * as styles from './StaffForm.css';

interface StaffFormProps {
  initialStaff?: StaffMember;
  onSubmit: (staffData: NewStaffMember) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  loading?: boolean;
}

const submitLabel = (isEditing: boolean, loading: boolean): string => {
  if (loading) {
    return isEditing ? 'Updating...' : 'Adding...';
  }
  return isEditing ? 'Update Staff Member' : 'Add Staff Member';
};

const StaffForm: React.FC<StaffFormProps> = ({
  initialStaff,
  onSubmit,
  onCancel,
  isEditing = false,
  loading = false,
}) => {
  const [formData, setFormData] = useState<NewStaffMember>({
    userId: initialStaff?.userId || '',
    title: initialStaff?.title || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof NewStaffMember, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.userId.trim()) {
      newErrors.userId = 'User ID is required';
    } else if (!/^user_0000[a-z0-9]{8}$/.test(formData.userId)) {
      newErrors.userId = 'Please enter a valid user ID (format: user_0000xxxxxxxx)';
    }

    if (formData.title && formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
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
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
      size="md"
      showCloseButton={!loading}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField
          label="User ID"
          htmlFor="userId"
          required
          error={errors.userId}
          description="This should be the user ID of an existing user in the system"
        >
          <Input
            id="userId"
            type="text"
            value={formData.userId}
            onChange={e => handleInputChange('userId', e.target.value)}
            placeholder="Enter the user ID of the user to add as staff (e.g., user_0000rscst01)"
            disabled={isEditing || loading}
            required
            aria-required={true}
            aria-invalid={!!errors.userId}
          />
        </FormField>

        <FormField label="Title" htmlFor="title" error={errors.title}>
          <Input
            id="title"
            type="text"
            value={formData.title || ''}
            onChange={e => handleInputChange('title', e.target.value)}
            placeholder="e.g., Volunteer, Coordinator, Manager"
            disabled={loading}
            maxLength={100}
            aria-invalid={!!errors.title}
          />
        </FormField>

        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading} isLoading={loading}>
            {submitLabel(isEditing, loading)}
          </Button>
        </div>
      </form>

      {!isEditing && (
        <div className={styles.formInfo}>
          <h3 className={styles.infoHeading}>How to find a User ID</h3>
          <ol className={styles.infoList}>
            <li>The user must first create an account on the platform</li>
            <li>Ask them to log in and navigate to their profile settings</li>
            <li>They can find their User ID in the profile section</li>
            <li>Copy the user ID and paste it in the field above</li>
          </ol>
        </div>
      )}
    </Modal>
  );
};

export default StaffForm;
