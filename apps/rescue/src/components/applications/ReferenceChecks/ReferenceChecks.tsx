import React from 'react';
import {
  Alert,
  Button,
  FormField,
  SelectInput,
  StatusBadge,
  TextArea,
} from '@adopt-dont-shop/lib.components';
import type { StatusBadgeVariant } from '@adopt-dont-shop/lib.types';
import { formatDate } from '@adopt-dont-shop/lib.utils';
import type { ReferenceCheck } from '../../../types/applications';
import * as styles from '../ApplicationReview.css';

const REFERENCE_STATUS_VARIANTS: Record<string, StatusBadgeVariant> = {
  verified: 'success',
  contacted: 'info',
  pending: 'warning',
  failed: 'error',
};

const REFERENCE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'verified', label: 'Verified' },
  { value: 'failed', label: 'Failed' },
];

type ReferenceUpdateState = {
  status: string;
  notes: string;
  showForm: boolean;
};

type ReferenceChecksProps = {
  references: ReferenceCheck[];
  referencesError?: string | null;
  referenceUpdates: Record<string, ReferenceUpdateState>;
  onToggleForm: (referenceId: string) => void;
  onUpdateField: (referenceId: string, field: 'status' | 'notes', value: string) => void;
  onUpdateReference: (referenceId: string, status: string, notes: string) => void;
};

export const ReferenceChecks: React.FC<ReferenceChecksProps> = ({
  references,
  referencesError,
  referenceUpdates,
  onToggleForm,
  onUpdateField,
  onUpdateReference,
}) => (
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Reference Checks</h3>
    {referencesError && (
      <Alert variant="error">
        <p>Failed to load reference checks.</p>
        <p>{referencesError}</p>
      </Alert>
    )}
    {references.length === 0 ? (
      <div className={styles.card}>
        <p>No references found for this application.</p>
      </div>
    ) : (
      references.map(reference => {
        const currentRefStatus = referenceUpdates[reference.id]?.status || reference.status;
        const currentNotes = referenceUpdates[reference.id]?.notes || reference.notes;
        return (
          <div key={reference.id} className={styles.referenceCard}>
            <div className={styles.referenceHeader}>
              <div className={styles.referenceInfo}>
                <h4 className={styles.referenceName}>{reference.contactName}</h4>
                <p className={styles.referenceContact}>{reference.contactInfo}</p>
                <p className={styles.referenceRelation}>Type: {reference.type}</p>
              </div>
              <StatusBadge
                variant={REFERENCE_STATUS_VARIANTS[currentRefStatus] ?? 'neutral'}
                label={currentRefStatus}
              />
            </div>

            {reference.completedAt && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Last Contacted</span>
                <span className={styles.fieldValue}>{formatDate(reference.completedAt)}</span>
              </div>
            )}

            {reference.completedBy && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Contacted By</span>
                <span className={styles.fieldValue}>{reference.completedBy}</span>
              </div>
            )}

            {currentNotes && <div className={styles.referenceNotes}>{currentNotes}</div>}

            <div className={styles.referenceActions}>
              <Button variant="secondary" onClick={() => onToggleForm(reference.id)}>
                {referenceUpdates[reference.id]?.showForm ? 'Cancel' : 'Update Status'}
              </Button>
            </div>

            {referenceUpdates[reference.id]?.showForm && (
              <div className={styles.referenceForm}>
                <div className={styles.formField}>
                  <SelectInput
                    label="Status"
                    value={referenceUpdates[reference.id]?.status || currentRefStatus}
                    onChange={value =>
                      onUpdateField(reference.id, 'status', typeof value === 'string' ? value : '')
                    }
                    options={REFERENCE_STATUS_OPTIONS}
                    fullWidth
                  />
                </div>
                <div className={styles.formField}>
                  <FormField label="Notes" htmlFor={`ref-notes-${reference.id}`}>
                    <TextArea
                      id={`ref-notes-${reference.id}`}
                      value={referenceUpdates[reference.id]?.notes || currentNotes}
                      onChange={e => onUpdateField(reference.id, 'notes', e.target.value)}
                      placeholder="Add notes about this reference check..."
                    />
                  </FormField>
                </div>
                <div className={styles.buttonGroup}>
                  <Button variant="secondary" onClick={() => onToggleForm(reference.id)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      onUpdateReference(
                        reference.id,
                        referenceUpdates[reference.id]?.status || currentRefStatus,
                        referenceUpdates[reference.id]?.notes || currentNotes || ''
                      )
                    }
                  >
                    Update Reference
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })
    )}
  </div>
);
