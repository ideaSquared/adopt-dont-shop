import React, { useState } from 'react';
import { Button, Input, Modal } from '@adopt-dont-shop/lib.components';
import { FiMail, FiAlertCircle, FiFileText } from 'react-icons/fi';
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

      const payload: RescueEmailPayload =
        selectedTemplate === 'custom'
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
    <div className={styles.footerButtons}>
      <Button type='button' variant='outline' onClick={onClose} disabled={loading || success}>
        {success ? 'Close' : 'Cancel'}
      </Button>
      {!success && (
        <Button
          type='button'
          variant='primary'
          onClick={handleSubmit}
          disabled={loading || !selectedTemplate}
        >
          {loading ? 'Sending...' : 'Send Email'}
        </Button>
      )}
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
        {error && (
          <div className={styles.errorMessage}>
            <FiAlertCircle />
            {error}
          </div>
        )}

        {success && (
          <div className={styles.successMessage}>
            <FiMail />
            Email sent successfully!
          </div>
        )}

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
                disabled={loading || success}
              >
                <div
                  className={clsx(
                    styles.templateIcon,
                    selectedTemplate === template.id && styles.templateIconSelected
                  )}
                >
                  <FiFileText />
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
              disabled={loading || success}
            >
              <div
                className={clsx(
                  styles.templateIcon,
                  selectedTemplate === 'custom' && styles.templateIconSelected
                )}
              >
                <FiMail />
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
              <label className={styles.label} htmlFor='email-subject'>
                Subject
                <span className={styles.requiredIndicator}>*</span>
              </label>
              <Input
                id='email-subject'
                type='text'
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder='Email subject...'
                required
                disabled={loading || success}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor='email-message'>
                Message
                <span className={styles.requiredIndicator}>*</span>
              </label>
              <textarea
                id='email-message'
                className={styles.textArea}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder='Type your message here...'
                required
                disabled={loading || success}
              />
              <div className={styles.helpText}>Plain text message for custom emails</div>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
