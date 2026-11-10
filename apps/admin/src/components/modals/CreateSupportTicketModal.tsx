import React, { useState } from 'react';
import {
  Alert,
  Button,
  FormField,
  Input,
  Modal,
  SelectInput,
  TextArea,
  toast,
} from '@adopt-dont-shop/lib.components';
import type { AdminUser } from '@/types';
import * as styles from './CreateSupportTicketModal.css';

type CreateSupportTicketModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onCreate: (data: {
    customerId: string;
    customerEmail: string;
    customerName: string;
    subject: string;
    description: string;
    category: string;
    priority: string;
  }) => Promise<void>;
};

const CATEGORY_OPTIONS = [
  { value: 'general_question', label: 'General Question' },
  { value: 'technical_issue', label: 'Technical Issue' },
  { value: 'account_problem', label: 'Account Problem' },
  { value: 'adoption_inquiry', label: 'Adoption Inquiry' },
  { value: 'payment_issue', label: 'Payment Issue' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'report_bug', label: 'Report Bug' },
  { value: 'compliance_concern', label: 'Compliance Concern' },
  { value: 'data_request', label: 'Data Request' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

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

      toast.success('Support ticket created successfully!');
      setSubject('');
      setDescription('');
      setCategory('general_question');
      setPriority('normal');
      onClose();
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

        {error && <Alert variant='error'>{error}</Alert>}

        <FormField label='Subject' htmlFor='ticket-subject' required>
          <Input
            key='subject-input'
            id='ticket-subject'
            type='text'
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder='Enter ticket subject'
            required
            aria-required={true}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label='Description' htmlFor='ticket-description' required>
          <TextArea
            key='description-textarea'
            id='ticket-description'
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder='Describe the issue or request...'
            required
            disabled={isSubmitting}
            minLength={10}
            maxLength={10000}
            fullWidth
          />
        </FormField>

        <div className={styles.formRow}>
          <SelectInput
            label='Category'
            data-testid='category'
            value={category}
            onChange={value => setCategory(String(value))}
            options={CATEGORY_OPTIONS}
            disabled={isSubmitting}
            fullWidth
          />

          <SelectInput
            label='Priority'
            data-testid='priority'
            value={priority}
            onChange={value => setPriority(String(value))}
            options={PRIORITY_OPTIONS}
            disabled={isSubmitting}
            fullWidth
          />
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
