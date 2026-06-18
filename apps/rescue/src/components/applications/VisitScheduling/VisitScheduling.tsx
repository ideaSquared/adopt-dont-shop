import React from 'react';
import type { HomeVisit } from '../../../types/applications';
import type { StaffMember } from '../../../services/staffService';
import * as styles from '../ApplicationReview.css';

type VisitForm = {
  scheduledDate: string;
  scheduledTime: string;
  assignedStaff: string;
  notes: string;
};

type RescheduleForm = {
  scheduledDate: string;
  scheduledTime: string;
  reason: string;
};

type CompleteForm = {
  outcome: 'approved' | 'rejected' | 'conditional' | '';
  notes: string;
  conditions: string;
};

type VisitSchedulingProps = {
  homeVisits: HomeVisit[];
  homeVisitsError?: string | null;
  staff: StaffMember[];
  staffLoading: boolean;
  showScheduleVisit: boolean;
  setShowScheduleVisit: (show: boolean) => void;
  visitForm: VisitForm;
  setVisitForm: React.Dispatch<React.SetStateAction<VisitForm>>;
  isSchedulingVisit: boolean;
  editingVisit: string | null;
  setEditingVisit: (id: string | null) => void;
  rescheduleForm: RescheduleForm;
  setRescheduleForm: React.Dispatch<React.SetStateAction<RescheduleForm>>;
  completingVisit: string | null;
  setCompletingVisit: (id: string | null) => void;
  completeForm: CompleteForm;
  setCompleteForm: React.Dispatch<React.SetStateAction<CompleteForm>>;
  viewingVisit: string | null;
  setViewingVisit: (id: string | null) => void;
  cancellingVisit: string | null;
  setCancellingVisit: (id: string | null) => void;
  cancelReason: string;
  setCancelReason: (reason: string) => void;
  emptyVisitForm: VisitForm;
  emptyRescheduleForm: RescheduleForm;
  emptyCompleteForm: CompleteForm;
  onScheduleVisit: () => void;
  onMarkVisitInProgress: (visitId: string) => void;
  onRescheduleVisit: (visitId: string) => void;
  onCompleteVisit: (visitId: string) => void;
  onCancelVisit: (visitId: string) => void;
};

export const VisitScheduling: React.FC<VisitSchedulingProps> = ({
  homeVisits,
  homeVisitsError,
  staff,
  staffLoading,
  showScheduleVisit,
  setShowScheduleVisit,
  visitForm,
  setVisitForm,
  isSchedulingVisit,
  editingVisit,
  setEditingVisit,
  rescheduleForm,
  setRescheduleForm,
  completingVisit,
  setCompletingVisit,
  completeForm,
  setCompleteForm,
  viewingVisit,
  setViewingVisit,
  cancellingVisit,
  setCancellingVisit,
  cancelReason,
  setCancelReason,
  emptyVisitForm,
  emptyRescheduleForm,
  emptyCompleteForm,
  onScheduleVisit,
  onMarkVisitInProgress,
  onRescheduleVisit,
  onCompleteVisit,
  onCancelVisit,
}) => {
  const hasActiveVisit = homeVisits.some(
    v => v.status === 'scheduled' || v.status === 'in_progress'
  );

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Home Visits</h3>
        <button
          className={styles.button({ variant: 'primary' })}
          onClick={() => setShowScheduleVisit(true)}
          disabled={hasActiveVisit}
        >
          {hasActiveVisit ? 'Visit Already Scheduled' : 'Schedule Visit'}
        </button>
      </div>

      {homeVisitsError && (
        <div className={styles.card} role="alert">
          <p>Failed to load home visits.</p>
          <p>{homeVisitsError}</p>
        </div>
      )}

      {showScheduleVisit && (
        <div className={styles.scheduleVisitForm}>
          <h4 className={styles.scheduleVisitTitle}>Schedule Home Visit</h4>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="visit-date">
                Date
              </label>
              <input
                id="visit-date"
                className={styles.formInput}
                type="date"
                value={visitForm.scheduledDate}
                onChange={e => setVisitForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="visit-time">
                Time
              </label>
              <input
                id="visit-time"
                className={styles.formInput}
                type="time"
                value={visitForm.scheduledTime}
                onChange={e => setVisitForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="visit-assigned-staff">
                Assigned Staff
              </label>
              <select
                id="visit-assigned-staff"
                className={styles.formSelect}
                value={visitForm.assignedStaff}
                onChange={e => setVisitForm(prev => ({ ...prev, assignedStaff: e.target.value }))}
                disabled={staffLoading}
              >
                <option value="">
                  {staffLoading ? 'Loading staff...' : 'Select staff member...'}
                </option>
                {staff.map(staffMember => (
                  <option
                    key={staffMember.id}
                    value={`${staffMember.firstName} ${staffMember.lastName}`}
                  >
                    {staffMember.firstName} {staffMember.lastName} - {staffMember.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="visit-notes">
                Visit Notes (optional)
              </label>
              <textarea
                id="visit-notes"
                className={styles.formTextarea}
                value={visitForm.notes}
                onChange={e => setVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special instructions or notes for the visit..."
                rows={3}
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button
              className={styles.button({ variant: 'secondary' })}
              onClick={() => {
                setShowScheduleVisit(false);
                setVisitForm(emptyVisitForm);
              }}
            >
              Cancel
            </button>
            <button
              className={styles.button({ variant: 'primary' })}
              onClick={onScheduleVisit}
              disabled={
                !visitForm.scheduledDate ||
                !visitForm.scheduledTime ||
                !visitForm.assignedStaff ||
                isSchedulingVisit
              }
            >
              {isSchedulingVisit ? 'Scheduling...' : 'Schedule Visit'}
            </button>
          </div>
        </div>
      )}

      {homeVisits.length === 0 ? (
        <div className={styles.emptyVisits}>
          <p>No home visits scheduled yet.</p>
          <p>
            Schedule a home visit to assess the applicant&apos;s living situation and suitability
            for pet adoption.
          </p>
        </div>
      ) : (
        homeVisits.map(visit => {
          const visitStatusVariant = (
            ['scheduled', 'in_progress', 'completed', 'cancelled'] as const
          ).includes(visit.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
            ? (visit.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
            : 'default';

          return (
            <div key={visit.id} className={styles.visitCard}>
              <div className={styles.visitHeader}>
                <div className={styles.visitInfo}>
                  <h4 className={styles.visitDate}>
                    {new Date(visit.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h4>
                  <p className={styles.visitTime}>at {visit.scheduledTime}</p>
                  <p className={styles.visitStaff}>Assigned to: {visit.assignedStaff}</p>
                </div>
                <span className={styles.visitStatus({ status: visitStatusVariant })}>
                  {visit.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {visit.notes && (
                <div className={styles.visitNotes}>
                  <strong>Visit Notes:</strong>
                  <div>{visit.notes}</div>
                </div>
              )}

              {visit.completedAt && (
                <div className={styles.visitCompletedInfo}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Completed On</span>
                    <span className={styles.fieldValue}>
                      {new Date(visit.completedAt).toLocaleDateString()} at{' '}
                      {new Date(visit.completedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {visit.outcome && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Outcome</span>
                      <span className={styles.fieldValue}>
                        <span
                          className={styles.visitOutcome({
                            outcome: (
                              ['approved', 'conditional', 'rejected'] as const
                            ).includes(
                              visit.outcome as 'approved' | 'conditional' | 'rejected'
                            )
                              ? (visit.outcome as 'approved' | 'conditional' | 'rejected')
                              : 'default',
                          })}
                        >
                          {visit.outcome.charAt(0).toUpperCase() + visit.outcome.slice(1)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.visitActions}>
                {visit.status === 'scheduled' && (
                  <>
                    <button
                      className={styles.button({ variant: 'primary' })}
                      onClick={() => onMarkVisitInProgress(visit.id)}
                    >
                      🏁 Start Visit
                    </button>
                    <button
                      className={styles.button({ variant: 'secondary' })}
                      onClick={() => {
                        setEditingVisit(visit.id);
                        setRescheduleForm({
                          scheduledDate: visit.scheduledDate,
                          scheduledTime: visit.scheduledTime,
                          reason: '',
                        });
                      }}
                    >
                      📅 Reschedule
                    </button>
                    <button
                      className={styles.button({ variant: 'danger' })}
                      onClick={() => {
                        setCancellingVisit(visit.id);
                        setCancelReason('');
                      }}
                    >
                      ❌ Cancel Visit
                    </button>
                  </>
                )}

                {visit.status === 'in_progress' && (
                  <>
                    <button
                      className={styles.button({ variant: 'primary' })}
                      onClick={() => setCompletingVisit(visit.id)}
                    >
                      ✅ Complete Visit
                    </button>
                    <button
                      className={styles.button({ variant: 'danger' })}
                      onClick={() => {
                        setCancellingVisit(visit.id);
                        setCancelReason('');
                      }}
                    >
                      ❌ Cancel Visit
                    </button>
                  </>
                )}

                {visit.status === 'completed' && (
                  <>
                    <button
                      className={styles.button({ variant: 'secondary' })}
                      onClick={() => setViewingVisit(visit.id)}
                    >
                      👁️ View Details
                    </button>
                    <button
                      className={styles.button({ variant: 'primary' })}
                      onClick={() => setShowScheduleVisit(true)}
                    >
                      🏠 Schedule Follow-up
                    </button>
                  </>
                )}

                {visit.status === 'cancelled' && (
                  <>
                    <button
                      className={styles.button({ variant: 'secondary' })}
                      onClick={() => setViewingVisit(visit.id)}
                    >
                      👁️ View Details
                    </button>
                    <button
                      className={styles.button({ variant: 'primary' })}
                      onClick={() => setShowScheduleVisit(true)}
                    >
                      🏠 Schedule New Visit
                    </button>
                  </>
                )}
              </div>

              {/* Reschedule Form */}
              {editingVisit === visit.id && (
                <div className={styles.rescheduleForm}>
                  <h5 className={styles.rescheduleTitle}>Reschedule Home Visit</h5>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label
                        className={styles.formLabel}
                        htmlFor={`reschedule-date-${visit.id}`}
                      >
                        New Date
                      </label>
                      <input
                        id={`reschedule-date-${visit.id}`}
                        className={styles.formInput}
                        type="date"
                        value={rescheduleForm.scheduledDate}
                        onChange={e =>
                          setRescheduleForm(prev => ({ ...prev, scheduledDate: e.target.value }))
                        }
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label
                        className={styles.formLabel}
                        htmlFor={`reschedule-time-${visit.id}`}
                      >
                        New Time
                      </label>
                      <input
                        id={`reschedule-time-${visit.id}`}
                        className={styles.formInput}
                        type="time"
                        value={rescheduleForm.scheduledTime}
                        onChange={e =>
                          setRescheduleForm(prev => ({ ...prev, scheduledTime: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label
                        className={styles.formLabel}
                        htmlFor={`reschedule-reason-${visit.id}`}
                      >
                        Reason for Rescheduling
                      </label>
                      <textarea
                        id={`reschedule-reason-${visit.id}`}
                        className={styles.formTextarea}
                        value={rescheduleForm.reason}
                        onChange={e =>
                          setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))
                        }
                        placeholder="Why is this visit being rescheduled?"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className={styles.formActions}>
                    <button
                      className={styles.button({ variant: 'secondary' })}
                      onClick={() => {
                        setEditingVisit(null);
                        setRescheduleForm(emptyRescheduleForm);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.button({ variant: 'primary' })}
                      onClick={() => onRescheduleVisit(visit.id)}
                      disabled={
                        !rescheduleForm.scheduledDate ||
                        !rescheduleForm.scheduledTime ||
                        !rescheduleForm.reason
                      }
                    >
                      Reschedule Visit
                    </button>
                  </div>
                </div>
              )}

              {/* Complete Visit Form */}
              {completingVisit === visit.id && (
                <div className={styles.completeVisitForm}>
                  <h5 className={styles.completeVisitTitle}>Complete Home Visit</h5>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label
                        className={styles.formLabel}
                        htmlFor={`complete-outcome-${visit.id}`}
                      >
                        Visit Outcome
                      </label>
                      <select
                        id={`complete-outcome-${visit.id}`}
                        className={styles.formSelect}
                        value={completeForm.outcome}
                        onChange={e =>
                          setCompleteForm(prev => ({
                            ...prev,
                            outcome: e.target.value as 'approved' | 'rejected' | 'conditional',
                          }))
                        }
                      >
                        <option value="">Select outcome...</option>
                        <option value="approved">Approved - Home is suitable</option>
                        <option value="conditional">
                          Conditional - Some concerns need addressing
                        </option>
                        <option value="rejected">Rejected - Home is not suitable</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label
                        className={styles.formLabel}
                        htmlFor={`complete-notes-${visit.id}`}
                      >
                        Visit Summary
                      </label>
                      <textarea
                        id={`complete-notes-${visit.id}`}
                        className={styles.formTextarea}
                        value={completeForm.notes}
                        onChange={e =>
                          setCompleteForm(prev => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Provide a detailed summary of the home visit findings..."
                        rows={4}
                      />
                    </div>
                  </div>
                  {completeForm.outcome === 'conditional' && (
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="conditions-textarea">
                          Conditions to Address
                        </label>
                        <textarea
                          id="conditions-textarea"
                          className={styles.formTextarea}
                          value={completeForm.conditions}
                          onChange={e =>
                            setCompleteForm(prev => ({ ...prev, conditions: e.target.value }))
                          }
                          placeholder="List specific conditions that need to be met..."
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                  <div className={styles.formActions}>
                    <button
                      className={styles.button({ variant: 'secondary' })}
                      onClick={() => {
                        setCompletingVisit(null);
                        setCompleteForm(emptyCompleteForm);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.button({ variant: 'primary' })}
                      onClick={() => onCompleteVisit(visit.id)}
                      disabled={!completeForm.outcome || !completeForm.notes}
                    >
                      Complete Visit
                    </button>
                  </div>
                </div>
              )}

              {/* Cancel Visit Form */}
              {cancellingVisit === visit.id && (
                <div
                  className={styles.rescheduleForm}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`cancel-visit-title-${visit.id}`}
                >
                  <h5 id={`cancel-visit-title-${visit.id}`} className={styles.rescheduleTitle}>
                    Cancel Home Visit
                  </h5>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label
                        className={styles.formLabel}
                        htmlFor={`cancel-reason-${visit.id}`}
                      >
                        Reason for Cancellation
                      </label>
                      <textarea
                        id={`cancel-reason-${visit.id}`}
                        className={styles.formTextarea}
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                        placeholder="Why is this visit being cancelled?"
                        rows={3}
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>
                  <div className={styles.formActions}>
                    <button
                      className={styles.button({ variant: 'secondary' })}
                      onClick={() => {
                        setCancellingVisit(null);
                        setCancelReason('');
                      }}
                    >
                      Keep Visit
                    </button>
                    <button
                      className={styles.button({ variant: 'danger' })}
                      onClick={() => onCancelVisit(visit.id)}
                      disabled={!cancelReason.trim()}
                    >
                      Confirm Cancellation
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Visit Details Modal */}
      {viewingVisit && homeVisits.find(v => v.id === viewingVisit) && (
        <div
          className={styles.visitDetailsModal}
          onClick={e => e.target === e.currentTarget && setViewingVisit(null)}
          onKeyDown={e => e.key === 'Escape' && setViewingVisit(null)}
          role="presentation"
        >
          <div className={styles.visitDetailsContent}>
            <div className={styles.visitDetailsHeader}>
              <h4>Visit Details</h4>
              <button
                className={styles.button({ variant: 'secondary' })}
                onClick={() => setViewingVisit(null)}
              >
                ×
              </button>
            </div>
            <div className={styles.visitDetailsBody}>
              {(() => {
                const visit = homeVisits.find(v => v.id === viewingVisit);
                if (!visit) {
                  return null;
                }

                const detailVisitStatusVariant = (
                  ['scheduled', 'in_progress', 'completed', 'cancelled'] as const
                ).includes(
                  visit.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
                )
                  ? (visit.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
                  : 'default';

                return (
                  <>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Original Date</span>
                      <span className={styles.fieldValue}>
                        {new Date(visit.scheduledDate).toLocaleDateString()} at{' '}
                        {visit.scheduledTime}
                      </span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Staff Member</span>
                      <span className={styles.fieldValue}>{visit.assignedStaff}</span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Status</span>
                      <span className={styles.fieldValue}>
                        <span className={styles.visitStatus({ status: detailVisitStatusVariant })}>
                          {visit.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </span>
                    </div>
                    {visit.outcome && (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Outcome</span>
                        <span className={styles.fieldValue}>
                          <span
                            className={styles.visitOutcome({
                              outcome: (
                                ['approved', 'conditional', 'rejected'] as const
                              ).includes(
                                visit.outcome as 'approved' | 'conditional' | 'rejected'
                              )
                                ? (visit.outcome as 'approved' | 'conditional' | 'rejected')
                                : 'default',
                            })}
                          >
                            {visit.outcome.charAt(0).toUpperCase() + visit.outcome.slice(1)}
                          </span>
                        </span>
                      </div>
                    )}
                    {visit.cancelReason && (
                      <div className={styles.fieldVertical}>
                        <span className={styles.fieldLabel}>Cancellation Reason</span>
                        <div className={styles.fieldValueFullWidth}>{visit.cancelReason}</div>
                      </div>
                    )}
                    {visit.completedAt && (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Completed At</span>
                        <span className={styles.fieldValue}>
                          {new Date(visit.completedAt).toLocaleDateString()} at{' '}
                          {new Date(visit.completedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {visit.cancelledAt && (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Cancelled At</span>
                        <span className={styles.fieldValue}>
                          {new Date(visit.cancelledAt).toLocaleDateString()} at{' '}
                          {new Date(visit.cancelledAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {visit.notes && (
                      <div className={styles.fieldVertical}>
                        <span className={styles.fieldLabel}>Visit Summary</span>
                        <div className={styles.fieldValueFullWidth}>{visit.notes}</div>
                      </div>
                    )}
                    {visit.outcomeNotes && (
                      <div className={styles.fieldVertical}>
                        <span className={styles.fieldLabel}>Outcome Notes</span>
                        <div className={styles.fieldValueFullWidth}>{visit.outcomeNotes}</div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
