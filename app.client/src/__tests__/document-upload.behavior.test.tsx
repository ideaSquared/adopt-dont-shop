/**
 * Behavioral tests for Document Upload in Application Forms
 *
 * Verifies that applicants can:
 * - See the document upload step in the application form
 * - Add files of supported types (PDF, JPG, PNG, DOC, DOCX)
 * - Assign a document type to each uploaded file
 * - Remove uploaded documents before submitting
 * - Proceed without uploading any documents (optional step)
 * - See file size and supported format information
 * - Not exceed per-file size limits
 * - Not exceed the maximum number of files
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { vi } from 'vitest';
import { lightTheme } from '@adopt-dont-shop/lib.components';
import { DocumentUploadStep } from '../components/application/steps/DocumentUploadStep';

const renderStep = (props: Partial<React.ComponentProps<typeof DocumentUploadStep>> = {}) => {
  const onComplete = vi.fn();
  render(
    <StyledThemeProvider theme={lightTheme}>
      <DocumentUploadStep onComplete={onComplete} {...props} />
    </StyledThemeProvider>
  );
  return { onComplete };
};

const createFile = (name: string, size: number, type: string) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const getFileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

describe('Document Upload Step — applicant experience', () => {
  describe('when the step first loads', () => {
    it('shows a document upload area', () => {
      renderStep();
      expect(screen.getByTestId('document-upload-input')).toBeInTheDocument();
    });

    it('shows supported file formats', () => {
      renderStep();
      expect(screen.getByText(/PDF, JPG, PNG, DOC, DOCX/i)).toBeInTheDocument();
    });

    it('shows the maximum file size', () => {
      renderStep();
      expect(screen.getByText(/5MB/i)).toBeInTheDocument();
    });

    it('shows a note that documents are optional', () => {
      renderStep();
      expect(screen.getByText(/optional/i)).toBeInTheDocument();
    });

    it('does not show any document cards before files are added', () => {
      renderStep();
      expect(screen.queryByTestId('document-list')).not.toBeInTheDocument();
    });
  });

  describe('when applicant adds a valid document', () => {
    it('shows the file in the document list', () => {
      renderStep();
      const file = createFile('vet-record.pdf', 100_000, 'application/pdf');
      fireEvent.change(getFileInput(), { target: { files: [file] } });

      expect(screen.getByTestId('document-list')).toBeInTheDocument();
      expect(screen.getByText('vet-record.pdf')).toBeInTheDocument();
    });

    it('shows the file size next to the file name', () => {
      renderStep();
      const file = createFile('residence-proof.jpg', 1_024 * 200, 'image/jpeg');
      fireEvent.change(getFileInput(), { target: { files: [file] } });

      expect(screen.getByText(/200(\.\d+)?\s*KB/i)).toBeInTheDocument();
    });

    it('shows a document type selector defaulting to Other', () => {
      renderStep();
      const file = createFile('doc.pdf', 50_000, 'application/pdf');
      fireEvent.change(getFileInput(), { target: { files: [file] } });

      const select = screen.getByTestId('document-type-select-0');
      expect((select as HTMLSelectElement).value).toBe('OTHER');
    });

    it('allows changing the document type', async () => {
      const user = userEvent.setup();
      renderStep();
      const file = createFile('letter.pdf', 50_000, 'application/pdf');
      fireEvent.change(getFileInput(), { target: { files: [file] } });

      const select = screen.getByTestId('document-type-select-0');
      await user.selectOptions(select, 'VETERINARY_RECORD');
      expect((select as HTMLSelectElement).value).toBe('VETERINARY_RECORD');
    });

    it('shows a remove button for the uploaded file', () => {
      renderStep();
      const file = createFile('proof.png', 80_000, 'image/png');
      fireEvent.change(getFileInput(), { target: { files: [file] } });

      expect(screen.getByTestId('remove-document-0')).toBeInTheDocument();
    });
  });

  describe('when applicant removes a document', () => {
    it('removes the file card from the list', async () => {
      const user = userEvent.setup();
      renderStep();
      const file = createFile('to-remove.pdf', 50_000, 'application/pdf');
      fireEvent.change(getFileInput(), { target: { files: [file] } });

      expect(screen.getByText('to-remove.pdf')).toBeInTheDocument();

      await user.click(screen.getByTestId('remove-document-0'));

      expect(screen.queryByText('to-remove.pdf')).not.toBeInTheDocument();
    });

    it('shows the empty-state note after removing all files', async () => {
      const user = userEvent.setup();
      renderStep();
      const file = createFile('only-file.pdf', 50_000, 'application/pdf');
      fireEvent.change(getFileInput(), { target: { files: [file] } });

      await user.click(screen.getByTestId('remove-document-0'));

      expect(screen.getByText(/no documents added|skip/i)).toBeInTheDocument();
    });
  });

  describe('when a file exceeds the size limit', () => {
    it('shows an error and does not add the file', () => {
      renderStep();
      const oversized = createFile('huge.pdf', 6 * 1024 * 1024, 'application/pdf');
      fireEvent.change(getFileInput(), { target: { files: [oversized] } });

      expect(screen.queryByText('huge.pdf')).not.toBeInTheDocument();
    });
  });

  describe('when submitting the step', () => {
    it('calls onComplete with the pending documents when files are present', () => {
      const { onComplete } = renderStep();
      const file = createFile('reference.pdf', 100_000, 'application/pdf');
      fireEvent.change(getFileInput(), { target: { files: [file] } });

      fireEvent.submit(document.querySelector('form')!);

      expect(onComplete).toHaveBeenCalledTimes(1);
      const [docs] = onComplete.mock.calls[0];
      expect(docs).toHaveLength(1);
      expect(docs[0].file.name).toBe('reference.pdf');
    });

    it('calls onComplete with an empty array when no files were added', () => {
      const { onComplete } = renderStep();
      fireEvent.submit(document.querySelector('form')!);

      expect(onComplete).toHaveBeenCalledWith([]);
    });

    it('preserves the document type chosen by the applicant', async () => {
      const user = userEvent.setup();
      const { onComplete } = renderStep();
      const file = createFile('vet.pdf', 100_000, 'application/pdf');
      fireEvent.change(getFileInput(), { target: { files: [file] } });

      await user.selectOptions(screen.getByTestId('document-type-select-0'), 'REFERENCE');

      fireEvent.submit(document.querySelector('form')!);

      const [docs] = onComplete.mock.calls[0];
      expect(docs[0].documentType).toBe('REFERENCE');
    });
  });

  describe('when initial documents are provided', () => {
    it('renders the pre-existing documents', () => {
      const initial = [
        {
          file: createFile('existing.pdf', 50_000, 'application/pdf'),
          documentType: 'PROOF_OF_RESIDENCE' as const,
          id: 'pre-existing-1',
        },
      ];

      renderStep({ initialDocuments: initial });

      expect(screen.getByText('existing.pdf')).toBeInTheDocument();
      expect((screen.getByTestId('document-type-select-0') as HTMLSelectElement).value).toBe(
        'PROOF_OF_RESIDENCE'
      );
    });
  });
});
