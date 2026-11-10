import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  Button,
  FormField,
  Input,
  Modal,
  TextArea,
  toast,
} from '@adopt-dont-shop/lib.components';
import { FileText, Mail } from 'lucide-react';
import clsx from 'clsx';
import type { AdminRescue, RescueEmailPayload } from '@/types/rescue';
import { rescueService } from '@/services/rescueService';
import * as styles from './SendEmailModal.css';

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

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  rescue,
  onClose,
  onSuccess,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const sendEmail = useMutation({
    mutationFn: (payload: RescueEmailPayload) => rescueService.sendEmail(rescue.rescueId, payload),
    onSuccess: () => {
      toast.success('Email sent successfully!');
      onSuccess();
      onClose();
    },
  });

  const loading = sendEmail.isPending;
  const error =
    validationError ??
    (sendEmail.error
      ? sendEmail.error instanceof Error
        ? sendEmail.error.message
        : 'Failed to send email'
      : null);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setSubject('');
    setBody('');
    setValidationError(null);
    sendEmail.reset();
  };

  const handleCustomSelect = () => {
    setSelectedTemplate('custom');
    setSubject('');
    setBody('');
    setValidationError(null);
    sendEmail.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTemplate === 'custom') {
      if (!subject.trim() || !body.trim()) {
        setValidationError('Subject and body are required for custom emails');
        return;
      }
    } else if (!selectedTemplate) {
      setValidationError('Please select a template or choose custom email');
      return;
    }

    setValidationError(null);
    sendEmail.reset();

    sendEmail.mutate(
      selectedTemplate === 'custom'
        ? {
            subject: subject.trim(),
            body: body.trim(),
          }
        : {
            templateId: EMAIL_TEMPLATES.find(t => t.id === selectedTemplate)?.templateId,
          }
    );
  };

  const selectedTemplateData = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);

  const modalHeader = (
    <div className={styles.modalHeader}>
      <Mail size={20} />
      <div>
        <div className={styles.modalHeaderTitle}>Send Email</div>
        <div className={styles.modalHeaderSubtitle}>Send an email to {rescue.name}</div>
      </div>
    </div>
  );

  const modalFooter = (
    <div className={styles.footerButtons}>
      <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button
        type='button'
        variant='primary'
        onClick={handleSubmit}
        disabled={loading || !selectedTemplate}
      >
        {loading ? 'Sending...' : 'Send Email'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='lg'
      header={modalHeader}
      footer={modalFooter}
      closeOnOverlayClick={!loading}
    >
      <form onSubmit={handleSubmit}>
        {error && <Alert variant='error'>{error}</Alert>}

        <div className={styles.infoBox}>
          <div className={styles.infoLabel}>Recipient</div>
          <div className={styles.infoValue}>{rescue.email}</div>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>Select Email Template</span>
          <div className={styles.templateGrid}>
            {EMAIL_TEMPLATES.map(template => (
              <button
                key={template.id}
                type='button'
                className={clsx(
                  styles.templateCard,
                  selectedTemplate === template.id && styles.templateCardSelected
                )}
                onClick={() => handleTemplateSelect(template.id)}
                disabled={loading}
              >
                <div
                  className={clsx(
                    styles.templateIcon,
                    selectedTemplate === template.id && styles.templateIconSelected
                  )}
                >
                  <FileText size='1em' />
                </div>
                <div className={styles.templateName}>{template.name}</div>
                <div className={styles.templateDescription}>{template.description}</div>
              </button>
            ))}
            <button
              type='button'
              className={clsx(
                styles.templateCard,
                selectedTemplate === 'custom' && styles.templateCardSelected
              )}
              onClick={handleCustomSelect}
              disabled={loading}
            >
              <div
                className={clsx(
                  styles.templateIcon,
                  selectedTemplate === 'custom' && styles.templateIconSelected
                )}
              >
                <Mail size='1em' />
              </div>
              <div className={styles.templateName}>Custom Email</div>
              <div className={styles.templateDescription}>Write your own message</div>
            </button>
          </div>
          <div className={styles.helpText}>
            Select a professional template or create a custom message
          </div>
        </div>

        {selectedTemplateData && (
          <div className={styles.templatePreview}>
            <div className={styles.previewLabel}>Template Preview</div>
            <div className={styles.previewSubject}>{selectedTemplateData.subject}</div>
            <div className={styles.previewDescription}>
              Professional HTML email will be sent with personalized content for {rescue.name}
            </div>
          </div>
        )}

        {selectedTemplate === 'custom' && (
          <>
            <div className={styles.formGroup}>
              <FormField label='Subject' htmlFor='email-subject' required>
                <Input
                  id='email-subject'
                  type='text'
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder='Email subject...'
                  required
                  disabled={loading}
                />
              </FormField>
            </div>

            <div className={styles.formGroup}>
              <FormField
                label='Message'
                htmlFor='email-message'
                required
                description='Plain text message for custom emails'
              >
                <TextArea
                  id='email-message'
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder='Type your message here...'
                  required
                  disabled={loading}
                  fullWidth
                />
              </FormField>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
