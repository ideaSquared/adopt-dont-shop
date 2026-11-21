import React, { useState } from 'react';
import { Button, FormField, Input, Modal } from '@adopt-dont-shop/lib.components';
import { NewStaffMember, StaffMember } from '../../types/staff';
import * as styles from './StaffForm.css';

interface StaffFormProps {
  initialStaff: StaffMember;
  onSubmit: (staffData: NewStaffMember) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const StaffForm: React.FC<StaffFormProps> = ({
  initialStaff,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<NewStaffMember>({
    userId: initialStaff.userId,
    title: initialStaff.title,
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
      title="Edit Staff Member"
      size="md"
      showCloseButton={!loading}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
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
            {loading ? 'Updating...' : 'Update Staff Member'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default StaffForm;
