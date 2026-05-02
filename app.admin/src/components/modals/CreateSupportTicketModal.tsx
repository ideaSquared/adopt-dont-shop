import React, { useState } from 'react';
import { Modal, Button, Input } from '@adopt-dont-shop/lib.components';
import type { AdminUser } from '@/types';
import styles from './CreateSupportTicketModal.css';

export const CreateSupportTicketModal: React.FC<CreateSupportTicketModalProps> = ({
  isOpen,
  onClose,
  user,
  onCreate,
}) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general_question');
  const [priority, setPriority] = useState('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await onCreate({
        customerId: user.userId,
        customerEmail: user.email,
        customerName: `${user.firstName} ${user.lastName}`,
        subject,
        description,
        category,
        priority,
      });

      setSuccess(true);
      setSubject('');
      setDescription('');
      setCategory('general_question');
      setPriority('normal');

      // Close modal after brief success message
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create support ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubject('');
      setDescription('');
      setCategory('general_question');
      setPriority('normal');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title='Create Support Ticket'
      size='lg'
      centered
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.infoBox}>
          This will create a support ticket on behalf of the user. They will receive email
          notifications about ticket updates.
        </div>

        <div className={styles.recipientInfo}>
          <div className={styles.recipientLabel}>For User</div>
          <div className={styles.recipientName}>
            {user.firstName} {user.lastName}
          </div>
          <div className={styles.recipientEmail}>{user.email}</div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && (
          <div className={styles.successMessage}>Support ticket created successfully!</div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor='ticket-subject'>
            Subject
          </label>
          <Input
            key='subject-input'
            id='ticket-subject'
            type='text'
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder='Enter ticket subject'
            required
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor='ticket-description'>
            Description
          </label>
          <textarea
            className={styles.textArea}
            key='description-textarea'
            id='ticket-description'
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder='Describe the issue or request...'
            required
            disabled={isSubmitting}
            minLength={10}
            maxLength={10000}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='category'>
              Category
            </label>
            <select
              className={styles.select}
              id='category'
              value={category}
              onChange={e => setCategory(e.target.value)}
              disabled={isSubmitting}
            >
              <option value='general_question'>General Question</option>
              <option value='technical_issue'>Technical Issue</option>
              <option value='account_problem'>Account Problem</option>
              <option value='adoption_inquiry'>Adoption Inquiry</option>
              <option value='payment_issue'>Payment Issue</option>
              <option value='feature_request'>Feature Request</option>
              <option value='report_bug'>Report Bug</option>
              <option value='compliance_concern'>Compliance Concern</option>
              <option value='data_request'>Data Request</option>
              <option value='other'>Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor='priority'>
              Priority
            </label>
            <select
              className={styles.select}
              id='priority'
              value={priority}
              onChange={e => setPriority(e.target.value)}
              disabled={isSubmitting}
            >
              <option value='low'>Low</option>
              <option value='normal'>Normal</option>
              <option value='high'>High</option>
              <option value='urgent'>Urgent</option>
              <option value='critical'>Critical</option>
            </select>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <Button
            type='button'
            variant='outline'
            size='md'
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            variant='primary'
            size='md'
            disabled={isSubmitting || !subject || !description}
          >
            {isSubmitting ? 'Creating...' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
