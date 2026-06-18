import React from 'react';
import type { ReferenceCheck } from '../../../types/applications';
import * as styles from '../ApplicationReview.css';

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
      <div className={styles.card} role="alert">
        <p>Failed to load reference checks.</p>
        <p>{referencesError}</p>
      </div>
    )}
    {references.length === 0 ? (
      <div className={styles.card}>
        <p>No references found for this application.</p>
      </div>
    ) : (
      references.map(reference => {
        const currentRefStatus = referenceUpdates[reference.id]?.status || reference.status;
        const currentNotes = referenceUpdates[reference.id]?.notes || reference.notes;
        const refStatusVariant = (
          ['verified', 'contacted', 'pending', 'failed'] as const
        ).includes(currentRefStatus as 'verified' | 'contacted' | 'pending' | 'failed')
          ? (currentRefStatus as 'verified' | 'contacted' | 'pending' | 'failed')
          : 'default';

        return (
          <div key={reference.id} className={styles.referenceCard}>
            <div className={styles.referenceHeader}>
              <div className={styles.referenceInfo}>
                <h4 className={styles.referenceName}>{reference.contactName}</h4>
                <p className={styles.referenceContact}>{reference.contactInfo}</p>
                <p className={styles.referenceRelation}>Type: {reference.type}</p>
              </div>
              <span className={styles.referenceStatus({ status: refStatusVariant })}>
                {currentRefStatus}
              </span>
            </div>

            {reference.completedAt && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Last Contacted</span>
                <span className={styles.fieldValue}>
                  {new Date(reference.completedAt).toLocaleDateString()}
                </span>
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
              <button
                className={styles.button({ variant: 'secondary' })}
                onClick={() => onToggleForm(reference.id)}
              >
                {referenceUpdates[reference.id]?.showForm ? 'Cancel' : 'Update Status'}
              </button>
            </div>

            {referenceUpdates[reference.id]?.showForm && (
              <div className={styles.referenceForm}>
                <div className={styles.formField}>
                  <label className={styles.label} htmlFor={`ref-status-${reference.id}`}>
                    Status
                  </label>
                  <select
                    id={`ref-status-${reference.id}`}
                    className={styles.statusSelect}
                    value={referenceUpdates[reference.id]?.status || currentRefStatus}
                    onChange={e => onUpdateField(reference.id, 'status', e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="contacted">Contacted</option>
                    <option value="verified">Verified</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.label} htmlFor={`ref-notes-${reference.id}`}>
                    Notes
                  </label>
                  <textarea
                    id={`ref-notes-${reference.id}`}
                    className={styles.notesInput}
                    value={referenceUpdates[reference.id]?.notes || currentNotes}
                    onChange={e => onUpdateField(reference.id, 'notes', e.target.value)}
                    placeholder="Add notes about this reference check..."
                  />
                </div>
                <div className={styles.buttonGroup}>
                  <button
                    className={styles.button({ variant: 'secondary' })}
                    onClick={() => onToggleForm(reference.id)}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.button({ variant: 'primary' })}
                    onClick={() =>
                      onUpdateReference(
                        reference.id,
                        referenceUpdates[reference.id]?.status || currentRefStatus,
                        referenceUpdates[reference.id]?.notes || currentNotes || ''
                      )
                    }
                  >
                    Update Reference
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })
    )}
  </div>
);
