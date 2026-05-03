import React, { useState } from 'react';
import { FileUpload } from '@adopt-dont-shop/lib.components';
import * as styles from './DocumentUploadStep.css';

const ACCEPTED_FORMATS = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;

const DOCUMENT_TYPES = [
  { value: 'REFERENCE', label: 'Reference Letter' },
  { value: 'VETERINARY_RECORD', label: 'Veterinary Record' },
  { value: 'PROOF_OF_RESIDENCE', label: 'Proof of Residence' },
  { value: 'OTHER', label: 'Other' },
] as const;

type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number]['value'];

type PendingDocument = {
  file: File;
  documentType: DocumentTypeValue;
  id: string;
};

type DocumentUploadStepProps = {
  onComplete: (documents: PendingDocument[]) => void;
  initialDocuments?: PendingDocument[];
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({
  onComplete,
  initialDocuments = [],
}) => {
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>(initialDocuments);
  const [uploadError, setUploadError] = useState<string | undefined>();

  const handleFilesSelect = (files: File[]) => {
    setUploadError(undefined);
    const newDocuments: PendingDocument[] = files
      .slice(0, MAX_FILES - pendingDocuments.length)
      .map(file => ({
        file,
        documentType: 'OTHER' as DocumentTypeValue,
        id: `${file.name}-${file.size}-${Date.now()}`,
      }));
    setPendingDocuments(prev => [...prev, ...newDocuments]);
  };

  const handleFileRemove = (index: number) => {
    setPendingDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleTypeChange = (index: number, documentType: DocumentTypeValue) => {
    setPendingDocuments(prev =>
      prev.map((doc, i) => (i === index ? { ...doc, documentType } : doc))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(pendingDocuments);
  };

  const documentCountLabel = `${pendingDocuments.length} document${
    pendingDocuments.length === 1 ? '' : 's'
  } ready to upload.`;

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Supporting Documents</h2>
      <p className={styles.stepDescription}>
        Upload any supporting documents to strengthen your application. This step is optional — you
        can also add documents later.
      </p>

      <form className={styles.form} id='step-5-form' onSubmit={handleSubmit}>
        <div>
          <FileUpload
            accept={ACCEPTED_FORMATS}
            multiple
            maxSize={MAX_FILE_SIZE}
            maxFiles={MAX_FILES}
            fullWidth
            onFilesSelect={handleFilesSelect}
            onError={setUploadError}
            error={uploadError}
            label='Upload Documents'
            placeholder='Drop documents here or click to browse'
            data-testid='document-upload-input'
          />
          <p className={styles.supportedFormats}>
            Supported formats: PDF, JPG, PNG, DOC, DOCX · Max size: 5MB per file · Up to {MAX_FILES}{' '}
            files
          </p>
        </div>

        {pendingDocuments.length > 0 && (
          <div className={styles.documentList} data-testid='document-list'>
            {pendingDocuments.map((doc, index) => (
              <div
                className={styles.documentCard}
                key={doc.id}
                data-testid={`document-card-${index}`}
              >
                <div className={styles.documentInfo}>
                  <span className={styles.documentName} title={doc.file.name}>
                    {doc.file.name}
                  </span>
                  <span className={styles.documentSize}>{formatFileSize(doc.file.size)}</span>
                </div>
                <select
                  className={styles.documentTypeSelect}
                  value={doc.documentType}
                  onChange={e => handleTypeChange(index, e.target.value as DocumentTypeValue)}
                  aria-label={`Document type for ${doc.file.name}`}
                  data-testid={`document-type-select-${index}`}
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <button
                  className={styles.removeButton}
                  type='button'
                  onClick={() => handleFileRemove(index)}
                  aria-label={`Remove ${doc.file.name}`}
                  data-testid={`remove-document-${index}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <p className={styles.skipNote}>
          {pendingDocuments.length === 0
            ? 'No documents added. You can skip this step or add documents now.'
            : documentCountLabel}
        </p>
      </form>
    </div>
  );
};
