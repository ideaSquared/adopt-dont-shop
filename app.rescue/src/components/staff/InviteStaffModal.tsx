import { InvitationPayload } from '@adopt-dont-shop/lib.invitations';
import React, { useState } from 'react';
import * as styles from './InviteStaffModal.css';

interface InviteStaffModalProps {
  onSubmit: (invitation: InvitationPayload) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const InviteStaffModal: React.FC<InviteStaffModalProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<InvitationPayload>({
    email: '',
    title: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof InvitationPayload, value: string) => {
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

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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
    <div
      className={styles.formOverlay}
      onClick={e => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      onKeyDown={e => e.key === 'Escape' && onCancel()}
      role="button"
      tabIndex={-1}
      aria-label="Close modal"
    >
      <div className={styles.formModal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Invite Staff Member</h2>
          <button
            className={styles.closeButton}
            onClick={onCancel}
            disabled={loading}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="email">
              Email Address <span className={styles.requiredIndicator}>*</span>
            </label>
            <input
              className={styles.formInput({ hasError: !!errors.email })}
              id="email"
              type="email"
              value={formData.email}
              onChange={e => handleInputChange('email', e.target.value)}
              placeholder="staff@example.com"
              disabled={loading}
              required
              autoFocus
            />
            {errors.email && <span className={styles.formError}>{errors.email}</span>}
            <small className={styles.formHelp}>
              Enter the email address of the person you want to invite
            </small>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="title">
              Title/Role
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
            <small className={styles.formHelp}>Optional: Specify the person's role or title</small>
          </div>

          <div className={styles.formInfo}>
            <div className={styles.infoSection}>
              <h4>📧 How invitations work:</h4>
              <ul>
                <li>An invitation email will be sent to the provided address</li>
                <li>The recipient will receive a secure link to create their account</li>
                <li>The invitation is valid for 7 days</li>
                <li>They'll be automatically added to your rescue team after signing up</li>
              </ul>
            </div>
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
                  Sending Invitation...
                </>
              ) : (
                'Send Invitation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteStaffModal;
