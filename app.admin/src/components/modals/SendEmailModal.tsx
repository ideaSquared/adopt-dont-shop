import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Heading, Text } from '@adopt-dont-shop/components';
import { FiX, FiMail, FiAlertCircle } from 'react-icons/fi';
import type { AdminRescue, RescueEmailPayload } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';

type SendEmailModalProps = {
  rescue: AdminRescue;
  onClose: () => void;
  onSuccess: () => void;
};

const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to Adopt Don\'t Shop!',
    body: 'Dear {rescueName},\n\nWelcome to our platform! We\'re excited to have you join our community of rescue organizations...',
  },
  approval: {
    subject: 'Your rescue organization has been approved',
    body: 'Dear {rescueName},\n\nCongratulations! Your rescue organization has been verified and approved on Adopt Don\'t Shop...',
  },
  reminder: {
    subject: 'Update your rescue profile',
    body: 'Dear {rescueName},\n\nWe noticed your profile could use some updates. Please take a moment to review and update your information...',
  },
  custom: {
    subject: '',
    body: '',
  },
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.theme.colors.primary[50]};
  color: ${props => props.theme.colors.primary[600]};

  svg {
    font-size: 1.5rem;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  color: #111827;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-family: inherit;
  color: #111827;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const InfoBox = styled.div`
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.25rem;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.375rem;
`;

const InfoValue = styled.div`
  font-size: 0.9375rem;
  color: #111827;
  font-weight: 500;
`;

const HelpText = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  margin-top: 0.375rem;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

const ErrorMessage = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 0.875rem;
  color: #991b1b;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    flex-shrink: 0;
  }
`;

const SuccessMessage = styled.div`
  background: #d1fae5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  padding: 0.875rem;
  color: #065f46;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RequiredIndicator = styled.span`
  color: #ef4444;
  margin-left: 0.25rem;
`;

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  rescue,
  onClose,
  onSuccess,
}) => {
  const [template, setTemplate] = useState<keyof typeof EMAIL_TEMPLATES>('custom');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTemplateChange = (newTemplate: keyof typeof EMAIL_TEMPLATES) => {
    setTemplate(newTemplate);
    const templateData = EMAIL_TEMPLATES[newTemplate];
    setSubject(templateData.subject.replace('{rescueName}', rescue.name));
    setBody(templateData.body.replace('{rescueName}', rescue.name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: RescueEmailPayload = {
        subject: subject.trim(),
        body: body.trim(),
        template: template !== 'custom' ? template : undefined,
      };

      await rescueService.sendEmail(rescue.rescueId, payload);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <ModalContainer>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <IconWrapper>
              <FiMail />
            </IconWrapper>
            <HeaderContent>
              <Heading level="h3" style={{ margin: 0 }}>
                Send Email
              </Heading>
              <Text style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                Send an email to {rescue.name}
              </Text>
            </HeaderContent>
          </ModalHeader>

          <ModalBody>
            {error && (
              <ErrorMessage>
                <FiAlertCircle />
                {error}
              </ErrorMessage>
            )}

            {success && (
              <SuccessMessage>
                <FiMail />
                Email sent successfully!
              </SuccessMessage>
            )}

            <InfoBox>
              <InfoLabel>Recipient</InfoLabel>
              <InfoValue>{rescue.email}</InfoValue>
            </InfoBox>

            <FormGroup>
              <Label>Email Template</Label>
              <Select
                value={template}
                onChange={(e) => handleTemplateChange(e.target.value as keyof typeof EMAIL_TEMPLATES)}
                disabled={loading || success}
              >
                <option value="custom">Custom Message</option>
                <option value="welcome">Welcome Email</option>
                <option value="approval">Approval Notification</option>
                <option value="reminder">Profile Update Reminder</option>
              </Select>
              <HelpText>Select a template or create a custom message</HelpText>
            </FormGroup>

            <FormGroup>
              <Label>
                Subject
                <RequiredIndicator>*</RequiredIndicator>
              </Label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                required
                disabled={loading || success}
              />
            </FormGroup>

            <FormGroup>
              <Label>
                Message
                <RequiredIndicator>*</RequiredIndicator>
              </Label>
              <TextArea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message here..."
                required
                disabled={loading || success}
              />
              <HelpText>Use {'{rescueName}'} for personalization</HelpText>
            </FormGroup>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || success}
            >
              {success ? 'Close' : 'Cancel'}
            </Button>
            {!success && (
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Email'}
              </Button>
            )}
          </ModalFooter>
        </form>
      </ModalContainer>
    </Overlay>
  );
};
