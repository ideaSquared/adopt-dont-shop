import React, { useState } from 'react';
import styled from 'styled-components';
import { FileUpload } from '@adopt-dont-shop/lib.components';

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

const StepContainer = styled.div`
  max-width: 600px;
`;

const StepTitle = styled.h2`
  font-size: 1.5rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 0.5rem;
`;

const StepDescription = styled.p`
  color: ${props => props.theme.text.secondary};
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: grid;
  gap: 1.5rem;
`;

const SupportedFormats = styled.p`
  font-size: 0.85rem;
  color: ${props => props.theme.text.secondary};
  margin-top: 0.5rem;
`;

const DocumentList = styled.div`
  display: grid;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const DocumentCard = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 8px;
  background: ${props => props.theme.background.secondary};
`;

const DocumentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
`;

const DocumentName = styled.span`
  font-size: 0.9rem;
  color: ${props => props.theme.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DocumentSize = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.text.secondary};
`;

const DocumentTypeSelect = styled.select`
  padding: 0.375rem 0.5rem;
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 4px;
  font-size: 0.85rem;
  background: ${props => props.theme.background.primary};
  color: ${props => props.theme.text.primary};
  cursor: pointer;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors?.semantic?.error?.[500] || '#ef4444'};
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1.2rem;
  line-height: 1;
  border-radius: 4px;

  &:hover {
    background-color: ${props => props.theme.colors?.semantic?.error?.[100] || '#fee2e2'}20;
  }
`;

const SkipNote = styled.p`
  font-size: 0.85rem;
  color: ${props => props.theme.text.secondary};
  font-style: italic;
  margin-top: 0.5rem;
`;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
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

  return (
    <StepContainer>
      <StepTitle>Supporting Documents</StepTitle>
      <StepDescription>
        Upload any supporting documents to strengthen your application. This step is optional — you
        can also add documents later.
      </StepDescription>

      <Form id='step-5-form' onSubmit={handleSubmit}>
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
          <SupportedFormats>
            Supported formats: PDF, JPG, PNG, DOC, DOCX · Max size: 5MB per file · Up to {MAX_FILES}{' '}
            files
          </SupportedFormats>
        </div>

        {pendingDocuments.length > 0 && (
          <DocumentList data-testid='document-list'>
            {pendingDocuments.map((doc, index) => (
              <DocumentCard key={doc.id} data-testid={`document-card-${index}`}>
                <DocumentInfo>
                  <DocumentName title={doc.file.name}>{doc.file.name}</DocumentName>
                  <DocumentSize>{formatFileSize(doc.file.size)}</DocumentSize>
                </DocumentInfo>
                <DocumentTypeSelect
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
                </DocumentTypeSelect>
                <RemoveButton
                  type='button'
                  onClick={() => handleFileRemove(index)}
                  aria-label={`Remove ${doc.file.name}`}
                  data-testid={`remove-document-${index}`}
                >
                  ×
                </RemoveButton>
              </DocumentCard>
            ))}
          </DocumentList>
        )}

        <SkipNote>
          {pendingDocuments.length === 0
            ? 'No documents added. You can skip this step or add documents now.'
            : `${pendingDocuments.length} document${pendingDocuments.length === 1 ? '' : 's'} ready to upload.`}
        </SkipNote>
      </Form>
    </StepContainer>
  );
};
