/**
 * Behavioral tests for PetCsvImportModal file-read error handling.
 *
 * Covers:
 * - When File.text() throws (e.g. binary / corrupt file), the modal
 *   surfaces a toast.error instead of letting an unhandled rejection
 *   propagate.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Toast mock — must be before importing the component
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@adopt-dont-shop/lib.components', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
  Modal: ({
    children,
    isOpen,
    title,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    title: string;
    size?: string;
    closeOnOverlayClick?: boolean;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
  toast: Object.assign(vi.fn(), {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  }),
}));

vi.mock('@adopt-dont-shop/lib.pets', () => ({
  IMPORTABLE_FIELDS: [
    { key: 'name', label: 'Name', required: true },
    { key: 'type', label: 'Type', required: true },
  ],
  parseCsv: vi.fn(() => ({
    headers: ['Name', 'Type'],
    rows: [{ Name: 'Buddy', Type: 'dog' }],
  })),
  autoMapColumns: vi.fn(() => ({ name: 'Name', type: 'Type' })),
  validateMappedRow: vi.fn(() => ({ ok: true, rowIndex: 1, externalId: null, data: {} })),
  petManagementService: {
    createPet: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('./PetCsvImportModal.css', () => ({
  stepContainer: 'stepContainer',
  stepHeader: 'stepHeader',
  steps: 'steps',
  stepActive: 'stepActive',
  dropZone: 'dropZone',
  helpText: 'helpText',
  hiddenInput: 'hiddenInput',
  actionsRow: 'actionsRow',
  mappingGrid: 'mappingGrid',
  fieldLabel: 'fieldLabel',
  requiredMark: 'requiredMark',
  select: 'select',
  scrollableTable: 'scrollableTable',
  previewTable: 'previewTable',
  previewCell: 'previewCell',
  rowOk: 'rowOk',
  rowError: 'rowError',
  summary: 'summary',
  summaryItem: 'summaryItem',
  summaryNumber: 'summaryNumber',
  warning: 'warning',
  stepDescription: 'stepDescription',
  importingMessage: 'importingMessage',
  errorList: 'errorList',
  failureTable: 'failureTable',
}));

import PetCsvImportModal from './PetCsvImportModal';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PetCsvImportModal – file read error handling', () => {
  it('shows a toast.error when File.text() throws (e.g. corrupt binary file)', async () => {
    render(
      <PetCsvImportModal isOpen={true} rescueId="rescue-1" onClose={vi.fn()} onImported={vi.fn()} />
    );

    // The upload step has a hidden file input; trigger it with a File whose
    // .text() method rejects to simulate a corrupt file read.
    const corruptFile = new File([''], 'bad.csv', { type: 'text/csv' });
    Object.defineProperty(corruptFile, 'text', {
      value: vi.fn().mockRejectedValue(new Error('Failed to read file')),
    });

    const input = screen.getByRole('dialog').querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    Object.defineProperty(input, 'files', {
      value: [corruptFile],
      configurable: true,
    });

    fireEvent.change(input!);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Could not read file');
    });
  });

  it('does NOT show a toast.error when a valid CSV file is uploaded', async () => {
    render(
      <PetCsvImportModal isOpen={true} rescueId="rescue-1" onClose={vi.fn()} onImported={vi.fn()} />
    );

    const validFile = new File(['Name,Type\nBuddy,dog'], 'pets.csv', { type: 'text/csv' });

    const input = screen.getByRole('dialog').querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    Object.defineProperty(input, 'files', {
      value: [validFile],
      configurable: true,
    });

    fireEvent.change(input!);

    // Wait briefly to let any async operations settle
    await waitFor(() => {
      expect(toastError).not.toHaveBeenCalled();
    });
  });
});
