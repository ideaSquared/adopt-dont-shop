import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Modal } from '@adopt-dont-shop/components';
import { FiMail, FiAlertCircle, FiFileText } from 'react-icons/fi';
import type { AdminRescue, RescueEmailPayload } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';

type SendEmailModalProps = {
  isOpen: boolean;
  rescue: AdminRescue;
  onClose: () => void;
  onSuccess: () => void;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  description: string;
  templateId: string;
};

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: "Welcome to Adopt Don't Shop",
    description: 'Warm welcome message for new rescue organizations',
    templateId: 'tmpl_rescue_welcome_001',
  },
  {
    id: 'approval',
    name: 'Verification Approved',
    subject: 'Your rescue has been verified',
    description: 'Congratulations message for verified organizations',
    templateId: 'tmpl_rescue_approved_001',
  },
  {
    id: 'reminder',
    name: 'Profile Update Reminder',
    subject: 'Time to update your profile',
    description: 'Friendly reminder to keep rescue information current',
    templateId: 'tmpl_rescue_reminder_001',
  },
];

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
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: 0.5rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.border.color.primary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  font-size: 0.9375rem;
  font-family: inherit;
  color: ${({ theme }) => theme.text.primary};
  background: ${({ theme }) => theme.background.primary};
  resize: vertical;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  &::placeholder {
    color: ${({ theme }) => theme.text.tertiary};
  }
`;

const InfoBox = styled.div`
  background: ${({ theme }) => theme.background.tertiary};
  border: 1px solid ${({ theme }) => theme.border.color.secondary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: 1rem;
  margin-bottom: 1.25rem;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.375rem;
`;

const InfoValue = styled.div`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.text.primary};
  font-weight: 500;
`;

const HelpText = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.text.tertiary};
  margin-top: 0.375rem;
`;

const ErrorMessage = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: ${({ theme }) => theme.border.radius.md};
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
  border-radius: ${({ theme }) => theme.border.radius.md};
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

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
`;

const TemplateCard = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1rem;
  border: 2px solid ${props => props.$selected ? props.theme.colors.primary[500] : props.theme.border.color.primary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  background: ${props => props.$selected ? props.theme.colors.primary[50] : props.theme.background.primary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  text-align: left;

  &:hover {
    border-color: ${props => props.theme.colors.primary[400]};
    background: ${props => props.theme.colors.primary[50]};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const TemplateIcon = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.border.radius.md};
  background: ${props => props.$selected ? props.theme.colors.primary[100] : props.theme.background.tertiary};
  color: ${props => props.$selected ? props.theme.colors.primary[600] : props.theme.text.tertiary};
  margin-bottom: 0.75rem;

  svg {
    font-size: 1.25rem;
  }
`;

const TemplateName = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.primary};
  margin-bottom: 0.25rem;
`;

const TemplateDescription = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.text.secondary};
  line-height: 1.4;
`;

const TemplatePreview = styled.div`
  background: ${({ theme }) => theme.background.tertiary};
  border: 1px solid ${({ theme }) => theme.border.color.secondary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: 1rem;
  margin-bottom: 1.25rem;
`;

const PreviewLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
`;

const PreviewSubject = styled.div`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.text.primary};
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const PreviewDescription = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.text.secondary};
  line-height: 1.5;
`;

const FooterButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  rescue,
  onClose,
  onSuccess,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setSubject('');
    setBody('');
    setError(null);
  };

  const handleCustomSelect = () => {
    setSelectedTemplate('custom');
    setSubject('');
    setBody('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTemplate === 'custom') {
      if (!subject.trim() || !body.trim()) {
        setError('Subject and body are required for custom emails');
        return;
      }
    } else if (!selectedTemplate) {
      setError('Please select a template or choose custom email');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: RescueEmailPayload = selectedTemplate === 'custom'
        ? {
            subject: subject.trim(),
            body: body.trim(),
          }
        : {
            templateId: EMAIL_TEMPLATES.find(t => t.id === selectedTemplate)?.templateId,
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

  const selectedTemplateData = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);

  const modalHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <FiMail size={20} />
      <div>
        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>Send Email</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.125rem' }}>
          Send an email to {rescue.name}
        </div>
      </div>
    </div>
  );

  const modalFooter = (
    <FooterButtons>
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
          type="button"
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || !selectedTemplate}
        >
          {loading ? 'Sending...' : 'Send Email'}
        </Button>
      )}
    </FooterButtons>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      header={modalHeader}
      footer={modalFooter}
      closeOnOverlayClick={!loading}
    >
      <form onSubmit={handleSubmit}>
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
          <Label>Select Email Template</Label>
          <TemplateGrid>
            {EMAIL_TEMPLATES.map((template) => (
              <TemplateCard
                key={template.id}
                type="button"
                $selected={selectedTemplate === template.id}
                onClick={() => handleTemplateSelect(template.id)}
                disabled={loading || success}
              >
                <TemplateIcon $selected={selectedTemplate === template.id}>
                  <FiFileText />
                </TemplateIcon>
                <TemplateName>{template.name}</TemplateName>
                <TemplateDescription>{template.description}</TemplateDescription>
              </TemplateCard>
            ))}
            <TemplateCard
              type="button"
              $selected={selectedTemplate === 'custom'}
              onClick={handleCustomSelect}
              disabled={loading || success}
            >
              <TemplateIcon $selected={selectedTemplate === 'custom'}>
                <FiMail />
              </TemplateIcon>
              <TemplateName>Custom Email</TemplateName>
              <TemplateDescription>Write your own message</TemplateDescription>
            </TemplateCard>
          </TemplateGrid>
          <HelpText>
            Select a professional template or create a custom message
          </HelpText>
        </FormGroup>

        {selectedTemplateData && (
          <TemplatePreview>
            <PreviewLabel>Template Preview</PreviewLabel>
            <PreviewSubject>{selectedTemplateData.subject}</PreviewSubject>
            <PreviewDescription>
              Professional HTML email will be sent with personalized content for {rescue.name}
            </PreviewDescription>
          </TemplatePreview>
        )}

        {selectedTemplate === 'custom' && (
          <>
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
              <HelpText>Plain text message for custom emails</HelpText>
            </FormGroup>
          </>
        )}
      </form>
    </Modal>
  );
};
