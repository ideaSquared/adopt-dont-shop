import React, { useState } from 'react';
import { NewStaffMember, StaffMember } from '../../types/staff';
import * as styles from './StaffForm.css';

interface StaffFormProps {
  initialStaff?: StaffMember;
  onSubmit: (staffData: NewStaffMember) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  loading?: boolean;
}

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
    <div className={styles.formOverlay}>
      <div className={styles.formModal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
          <button className={styles.closeButton} onClick={onCancel} disabled={loading}>
            ✕
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="userId">
              User ID <span className={styles.requiredIndicator}>*</span>
            </label>
            <input
              className={styles.formInput({ hasError: !!errors.userId })}
              id="userId"
              type="text"
              value={formData.userId}
              onChange={e => handleInputChange('userId', e.target.value)}
              placeholder="Enter the user ID of the user to add as staff (e.g., user_0000rscst01)"
              disabled={isEditing || loading}
              required
            />
            {errors.userId && <span className={styles.formError}>{errors.userId}</span>}
            <small className={styles.formHelp}>
              This should be the user ID of an existing user in the system
            </small>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="title">
              Title
            </label>
            <input
              className={styles.formInput({ hasError: !!errors.title })}
              id="title"
              type="text"
              value={formData.title || ''}
              onChange={e => handleInputChange('title', e.target.value)}
              placeholder="e.g., Volunteer, Coordinator, Manager"
              disabled={loading}
              maxLength={100}
            />
            {errors.title && <span className={styles.formError}>{errors.title}</span>}
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.actionButton({ variant: 'secondary' })}
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.actionButton({ variant: 'primary' })}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.loadingSpinner} />
                  {isEditing ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>{isEditing ? 'Update Staff Member' : 'Add Staff Member'}</>
              )}
            </button>
          </div>
        </form>

        {!isEditing && (
          <div className={styles.formInfo}>
            <div className={styles.infoSection}>
              <h4>💡 How to find a User ID:</h4>
              <ol>
                <li>The user must first create an account on the platform</li>
                <li>Ask them to log in and navigate to their profile settings</li>
                <li>They can find their User ID in the profile section</li>
                <li>Copy the user ID and paste it in the field above</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffForm;
