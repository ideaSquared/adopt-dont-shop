import { InvitationPayload } from '@adopt-dont-shop/lib.invitations';
import { Button, FormField, Input, Modal } from '@adopt-dont-shop/lib.components';
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
    <Modal
      isOpen
      onClose={onCancel}
      title="Invite Staff Member"
      size="md"
      showCloseButton={!loading}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField
          label="Email Address"
          htmlFor="email"
          required
          error={errors.email}
          description="Enter the email address of the person you want to invite"
        >
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            placeholder="staff@example.com"
            disabled={loading}
            required
            aria-required={true}
            aria-invalid={!!errors.email}
          />
        </FormField>

        <FormField
          label="Title/Role"
          htmlFor="title"
          error={errors.title}
          description="Optional: Specify the person's role or title"
        >
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

        <div className={styles.formInfo}>
          <h3 className={styles.infoHeading}>How invitations work</h3>
          <ul className={styles.infoList}>
            <li>We send an invitation email to the provided address</li>
            <li>The recipient gets a secure link to create their account</li>
            <li>The invitation is valid for 7 days</li>
            <li>They'll be automatically added to your rescue team after signing up</li>
          </ul>
        </div>

        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading} isLoading={loading}>
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteStaffModal;
