import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Input, Heading, Text } from '@adopt-dont-shop/components';
import { FiX, FiMail, FiAlertCircle, FiFileText } from 'react-icons/fi';
import type { AdminRescue, RescueEmailPayload } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';

type SendEmailModalProps = {
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
  flex-shrink: 0;
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
  overflow-x: hidden;
  padding: 1.5rem;
  min-height: 0;
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
  flex-shrink: 0;
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

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
`;

const TemplateCard = styled.button<{ selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1rem;
  border: 2px solid ${props => props.selected ? props.theme.colors.primary[500] : '#e5e7eb'};
  border-radius: 8px;
  background: ${props => props.selected ? props.theme.colors.primary[50] : '#ffffff'};
  cursor: pointer;
  transition: all 0.2s ease;
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

const TemplateIcon = styled.div<{ selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${props => props.selected ? props.theme.colors.primary[100] : '#f3f4f6'};
  color: ${props => props.selected ? props.theme.colors.primary[600] : '#6b7280'};
  margin-bottom: 0.75rem;

  svg {
    font-size: 1.25rem;
  }
`;

const TemplateName = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
`;

const TemplateDescription = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
`;

const TemplatePreview = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.25rem;
`;

const PreviewLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
`;

const PreviewSubject = styled.div`
  font-size: 0.9375rem;
  color: #111827;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const PreviewDescription = styled.div`
  font-size: 0.875rem;
  color: #4b5563;
  line-height: 1.5;
`;

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const selectedTemplateData = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);

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
              <Label>Select Email Template</Label>
              <TemplateGrid>
                {EMAIL_TEMPLATES.map((template) => (
                  <TemplateCard
                    key={template.id}
                    type="button"
                    selected={selectedTemplate === template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    disabled={loading || success}
                  >
                    <TemplateIcon selected={selectedTemplate === template.id}>
                      <FiFileText />
                    </TemplateIcon>
                    <TemplateName>{template.name}</TemplateName>
                    <TemplateDescription>{template.description}</TemplateDescription>
                  </TemplateCard>
                ))}
                <TemplateCard
                  type="button"
                  selected={selectedTemplate === 'custom'}
                  onClick={handleCustomSelect}
                  disabled={loading || success}
                >
                  <TemplateIcon selected={selectedTemplate === 'custom'}>
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
                disabled={loading || !selectedTemplate}
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
