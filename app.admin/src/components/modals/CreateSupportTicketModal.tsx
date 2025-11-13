import React, { useState } from 'react';
import styled from 'styled-components';
import { Modal, Button, Input } from '@adopt-dont-shop/lib.components';
import type { AdminUser } from '@/types';

type CreateSupportTicketModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onCreate: (ticketData: {
    customerId: string;
    customerEmail: string;
    customerName: string;
    subject: string;
    description: string;
    category: string;
    priority: string;
  }) => Promise<void>;
};

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`;

const Select = styled.select`
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const TextArea = styled.textarea`
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #ffffff;
  font-family: inherit;
  resize: vertical;
  min-height: 150px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const RecipientInfo = styled.div`
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const RecipientLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
`;

const RecipientName = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
`;

const RecipientEmail = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.875rem;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  background: #d1fae5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  color: #065f46;
  font-size: 0.875rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const InfoBox = styled.div`
  padding: 0.75rem 1rem;
  background: #dbeafe;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  color: #1e40af;
  font-size: 0.875rem;
`;

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
    if (!user) return;

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

  if (!user) return null;

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
      <Form onSubmit={handleSubmit}>
        <InfoBox>
          This will create a support ticket on behalf of the user. They will receive email
          notifications about ticket updates.
        </InfoBox>

        <RecipientInfo>
          <RecipientLabel>For User</RecipientLabel>
          <RecipientName>
            {user.firstName} {user.lastName}
          </RecipientName>
          <RecipientEmail>{user.email}</RecipientEmail>
        </RecipientInfo>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>Support ticket created successfully!</SuccessMessage>}

        <FormGroup>
          <Label htmlFor='ticket-subject'>Subject</Label>
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
        </FormGroup>

        <FormGroup>
          <Label htmlFor='ticket-description'>Description</Label>
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
          />
        </FormGroup>

        <FormRow>
          <FormGroup>
            <Label htmlFor='category'>Category</Label>
            <Select
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
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor='priority'>Priority</Label>
            <Select
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
            </Select>
          </FormGroup>
        </FormRow>

        <ButtonGroup>
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
        </ButtonGroup>
      </Form>
    </Modal>
  );
};
