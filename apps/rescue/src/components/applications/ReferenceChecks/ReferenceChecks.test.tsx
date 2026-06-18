/**
 * Behaviour tests for ReferenceChecks module.
 *
 * Tests verify that rescue staff can view references, open/close the
 * update form, and submit status changes.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReferenceChecks } from './ReferenceChecks';
import type { ReferenceCheck } from '../../../types/applications';

vi.mock('../ApplicationReview.css', () => {
  const names = [
    'button',
    'buttonGroup',
    'card',
    'field',
    'fieldLabel',
    'fieldValue',
    'formField',
    'label',
    'notesInput',
    'referenceActions',
    'referenceCard',
    'referenceContact',
    'referenceForm',
    'referenceHeader',
    'referenceInfo',
    'referenceName',
    'referenceNotes',
    'referenceRelation',
    'referenceStatus',
    'section',
    'sectionTitle',
    'statusSelect',
  ] as const;
  const out: Record<string, unknown> = {};
  for (const name of names) {
    const fn = (..._args: unknown[]) => name;
    out[name] = Object.assign(fn, { toString: () => name });
  }
  return out;
});

const personalRef: ReferenceCheck = {
  id: 'ref-1',
  applicationId: 'app-1',
  type: 'personal',
  contactName: 'Alice Smith',
  contactInfo: '555-1234 - Friend',
  status: 'pending',
  notes: '',
};

const defaultProps = {
  references: [personalRef],
  referencesError: null,
  referenceUpdates: {},
  onToggleForm: vi.fn(),
  onUpdateField: vi.fn(),
  onUpdateReference: vi.fn(),
};

describe('ReferenceChecks — reference list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the empty state when there are no references', () => {
    render(<ReferenceChecks {...defaultProps} references={[]} />);
    expect(screen.getByText(/no references found/i)).toBeInTheDocument();
  });

  it('renders a reference with contact name and type', () => {
    render(<ReferenceChecks {...defaultProps} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText(/personal/i)).toBeInTheDocument();
  });

  it('shows an alert when referencesError is set', () => {
    render(<ReferenceChecks {...defaultProps} referencesError="service unavailable" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load reference checks/i);
  });
});

describe('ReferenceChecks — update form', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onToggleForm when Update Status is clicked', () => {
    const onToggleForm = vi.fn();
    render(<ReferenceChecks {...defaultProps} onToggleForm={onToggleForm} />);
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));
    expect(onToggleForm).toHaveBeenCalledWith('ref-1');
  });

  it('renders the update form when showForm is true for a reference', () => {
    render(
      <ReferenceChecks
        {...defaultProps}
        referenceUpdates={{ 'ref-1': { status: 'contacted', notes: '', showForm: true } }}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onUpdateReference with the selected status when Update Reference is clicked', async () => {
    const onUpdateReference = vi.fn();
    render(
      <ReferenceChecks
        {...defaultProps}
        referenceUpdates={{ 'ref-1': { status: 'contacted', notes: 'Left voicemail', showForm: true } }}
        onUpdateReference={onUpdateReference}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /update reference/i }));

    await waitFor(() => {
      expect(onUpdateReference).toHaveBeenCalledWith('ref-1', 'contacted', 'Left voicemail');
    });
  });
});
