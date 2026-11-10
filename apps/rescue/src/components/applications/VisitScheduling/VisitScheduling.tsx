import React from 'react';
import { CalendarDays, CircleCheck, CircleX, Eye, Flag, House } from 'lucide-react';
import {
  Alert,
  Button,
  EmptyState,
  FormField,
  Input,
  Modal,
  SelectInput,
  StatusBadge,
  TextArea,
} from '@adopt-dont-shop/lib.components';
import type { StatusBadgeVariant } from '@adopt-dont-shop/lib.types';
import { formatCustomDate, formatDate, formatTime } from '@adopt-dont-shop/lib.utils';
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

type VisitOutcome = 'approved' | 'rejected' | 'conditional';

const OUTCOME_OPTIONS: { value: VisitOutcome; label: string }[] = [
  { value: 'approved', label: 'Approved - Home is suitable' },
  { value: 'conditional', label: 'Conditional - Some concerns need addressing' },
  { value: 'rejected', label: 'Rejected - Home is not suitable' },
];

const isVisitOutcome = (value: string): value is VisitOutcome =>
  OUTCOME_OPTIONS.some(option => option.value === value);

const VISIT_STATUS_VARIANTS: Record<string, StatusBadgeVariant> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const VISIT_OUTCOME_VARIANTS: Record<string, StatusBadgeVariant> = {
  approved: 'success',
  conditional: 'warning',
  rejected: 'error',
};

const formatDateAtTime = (value: string): string => `${formatDate(value)} at ${formatTime(value)}`;

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
  const detailVisit = viewingVisit ? homeVisits.find(v => v.id === viewingVisit) : undefined;
  const cancelTarget = cancellingVisit ? homeVisits.find(v => v.id === cancellingVisit) : undefined;

  const startCancelling = (visitId: string) => {
    setCancellingVisit(visitId);
    setCancelReason('');
  };

  const outcomeBadge = (outcome: string) => (
    <StatusBadge
      variant={VISIT_OUTCOME_VARIANTS[outcome] ?? 'neutral'}
      label={outcome.charAt(0).toUpperCase() + outcome.slice(1)}
    />
  );

  const statusBadge = (status: string) => (
    <StatusBadge
      variant={VISIT_STATUS_VARIANTS[status] ?? 'neutral'}
      label={status.replace('_', ' ').toUpperCase()}
    />
  );

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Home Visits</h3>
        <Button onClick={() => setShowScheduleVisit(true)} disabled={hasActiveVisit}>
          {hasActiveVisit ? 'Visit Already Scheduled' : 'Schedule Visit'}
        </Button>
      </div>

      {homeVisitsError && (
        <Alert variant="error" title="Failed to load home visits.">
          {homeVisitsError}
        </Alert>
      )}

      {showScheduleVisit && (
        <div className={styles.scheduleVisitForm}>
          <h4 className={styles.scheduleVisitTitle}>Schedule Home Visit</h4>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <FormField label="Date" htmlFor="visit-date">
                <Input
                  id="visit-date"
                  type="date"
                  value={visitForm.scheduledDate}
                  onChange={e => setVisitForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </FormField>
            </div>
            <div className={styles.formGroup}>
              <FormField label="Time" htmlFor="visit-time">
                <Input
                  id="visit-time"
                  type="time"
                  value={visitForm.scheduledTime}
                  onChange={e => setVisitForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                />
              </FormField>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <SelectInput
                label="Assigned Staff"
                value={visitForm.assignedStaff}
                onChange={value =>
                  setVisitForm(prev => ({
                    ...prev,
                    assignedStaff: typeof value === 'string' ? value : '',
                  }))
                }
                disabled={staffLoading}
                placeholder={staffLoading ? 'Loading staff...' : 'Select staff member...'}
                options={staff.map(staffMember => ({
                  value: `${staffMember.firstName} ${staffMember.lastName}`,
                  label: `${staffMember.firstName} ${staffMember.lastName} - ${staffMember.title}`,
                }))}
                fullWidth
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <FormField label="Visit Notes (optional)" htmlFor="visit-notes">
                <TextArea
                  id="visit-notes"
                  value={visitForm.notes}
                  onChange={e => setVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions or notes for the visit..."
                  rows={3}
                />
              </FormField>
            </div>
          </div>
          <div className={styles.formActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowScheduleVisit(false);
                setVisitForm(emptyVisitForm);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={onScheduleVisit}
              disabled={
                !visitForm.scheduledDate ||
                !visitForm.scheduledTime ||
                !visitForm.assignedStaff ||
                isSchedulingVisit
              }
            >
              {isSchedulingVisit ? 'Scheduling...' : 'Schedule Visit'}
            </Button>
          </div>
        </div>
      )}

      {homeVisits.length === 0 ? (
        <EmptyState
          title="No home visits scheduled yet."
          description="Schedule a home visit to assess the applicant's living situation and suitability for pet adoption."
          size="sm"
        />
      ) : (
        homeVisits.map(visit => (
          <div key={visit.id} className={styles.visitCard}>
            <div className={styles.visitHeader}>
              <div className={styles.visitInfo}>
                <h4 className={styles.visitDate}>
                  {formatCustomDate(visit.scheduledDate, 'EEEE d MMMM yyyy')}
                </h4>
                <p className={styles.visitTime}>at {visit.scheduledTime}</p>
                <p className={styles.visitStaff}>Assigned to: {visit.assignedStaff}</p>
              </div>
              {statusBadge(visit.status)}
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
                  <span className={styles.fieldValue}>{formatDateAtTime(visit.completedAt)}</span>
                </div>
                {visit.outcome && (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Outcome</span>
                    <span className={styles.fieldValue}>{outcomeBadge(visit.outcome)}</span>
                  </div>
                )}
              </div>
            )}

            <div className={styles.visitActions}>
              {visit.status === 'scheduled' && (
                <>
                  <Button
                    startIcon={<Flag size="1em" aria-hidden="true" />}
                    onClick={() => onMarkVisitInProgress(visit.id)}
                  >
                    Start Visit
                  </Button>
                  <Button
                    variant="secondary"
                    startIcon={<CalendarDays size="1em" aria-hidden="true" />}
                    onClick={() => {
                      setEditingVisit(visit.id);
                      setRescheduleForm({
                        scheduledDate: visit.scheduledDate,
                        scheduledTime: visit.scheduledTime,
                        reason: '',
                      });
                    }}
                  >
                    Reschedule
                  </Button>
                  <Button
                    variant="danger"
                    startIcon={<CircleX size="1em" aria-hidden="true" />}
                    onClick={() => startCancelling(visit.id)}
                  >
                    Cancel Visit
                  </Button>
                </>
              )}

              {visit.status === 'in_progress' && (
                <>
                  <Button
                    startIcon={<CircleCheck size="1em" aria-hidden="true" />}
                    onClick={() => setCompletingVisit(visit.id)}
                  >
                    Complete Visit
                  </Button>
                  <Button
                    variant="danger"
                    startIcon={<CircleX size="1em" aria-hidden="true" />}
                    onClick={() => startCancelling(visit.id)}
                  >
                    Cancel Visit
                  </Button>
                </>
              )}

              {visit.status === 'completed' && (
                <>
                  <Button
                    variant="secondary"
                    startIcon={<Eye size="1em" aria-hidden="true" />}
                    onClick={() => setViewingVisit(visit.id)}
                  >
                    View Details
                  </Button>
                  <Button
                    startIcon={<House size="1em" aria-hidden="true" />}
                    onClick={() => setShowScheduleVisit(true)}
                  >
                    Schedule Follow-up
                  </Button>
                </>
              )}

              {visit.status === 'cancelled' && (
                <>
                  <Button
                    variant="secondary"
                    startIcon={<Eye size="1em" aria-hidden="true" />}
                    onClick={() => setViewingVisit(visit.id)}
                  >
                    View Details
                  </Button>
                  <Button
                    startIcon={<House size="1em" aria-hidden="true" />}
                    onClick={() => setShowScheduleVisit(true)}
                  >
                    Schedule New Visit
                  </Button>
                </>
              )}
            </div>

            {/* Reschedule Form */}
            {editingVisit === visit.id && (
              <div className={styles.rescheduleForm}>
                <h5 className={styles.rescheduleTitle}>Reschedule Home Visit</h5>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <FormField label="New Date" htmlFor={`reschedule-date-${visit.id}`}>
                      <Input
                        id={`reschedule-date-${visit.id}`}
                        type="date"
                        value={rescheduleForm.scheduledDate}
                        onChange={e =>
                          setRescheduleForm(prev => ({ ...prev, scheduledDate: e.target.value }))
                        }
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </FormField>
                  </div>
                  <div className={styles.formGroup}>
                    <FormField label="New Time" htmlFor={`reschedule-time-${visit.id}`}>
                      <Input
                        id={`reschedule-time-${visit.id}`}
                        type="time"
                        value={rescheduleForm.scheduledTime}
                        onChange={e =>
                          setRescheduleForm(prev => ({ ...prev, scheduledTime: e.target.value }))
                        }
                      />
                    </FormField>
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <FormField
                      label="Reason for Rescheduling"
                      htmlFor={`reschedule-reason-${visit.id}`}
                    >
                      <TextArea
                        id={`reschedule-reason-${visit.id}`}
                        value={rescheduleForm.reason}
                        onChange={e =>
                          setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))
                        }
                        placeholder="Why is this visit being rescheduled?"
                        rows={2}
                      />
                    </FormField>
                  </div>
                </div>
                <div className={styles.formActions}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingVisit(null);
                      setRescheduleForm(emptyRescheduleForm);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => onRescheduleVisit(visit.id)}
                    disabled={
                      !rescheduleForm.scheduledDate ||
                      !rescheduleForm.scheduledTime ||
                      !rescheduleForm.reason
                    }
                  >
                    Reschedule Visit
                  </Button>
                </div>
              </div>
            )}

            {/* Complete Visit Form */}
            {completingVisit === visit.id && (
              <div className={styles.completeVisitForm}>
                <h5 className={styles.completeVisitTitle}>Complete Home Visit</h5>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <SelectInput
                      label="Visit Outcome"
                      value={completeForm.outcome}
                      onChange={value =>
                        setCompleteForm(prev => ({
                          ...prev,
                          outcome: typeof value === 'string' && isVisitOutcome(value) ? value : '',
                        }))
                      }
                      placeholder="Select outcome..."
                      options={OUTCOME_OPTIONS}
                      fullWidth
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <FormField label="Visit Summary" htmlFor={`complete-notes-${visit.id}`}>
                      <TextArea
                        id={`complete-notes-${visit.id}`}
                        value={completeForm.notes}
                        onChange={e =>
                          setCompleteForm(prev => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Provide a detailed summary of the home visit findings..."
                        rows={4}
                      />
                    </FormField>
                  </div>
                </div>
                {completeForm.outcome === 'conditional' && (
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <FormField label="Conditions to Address" htmlFor="conditions-textarea">
                        <TextArea
                          id="conditions-textarea"
                          value={completeForm.conditions}
                          onChange={e =>
                            setCompleteForm(prev => ({ ...prev, conditions: e.target.value }))
                          }
                          placeholder="List specific conditions that need to be met..."
                          rows={3}
                        />
                      </FormField>
                    </div>
                  </div>
                )}
                <div className={styles.formActions}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCompletingVisit(null);
                      setCompleteForm(emptyCompleteForm);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => onCompleteVisit(visit.id)}
                    disabled={!completeForm.outcome || !completeForm.notes}
                  >
                    Complete Visit
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Cancel Visit Dialog */}
      {cancelTarget && (
        <Modal
          isOpen
          onClose={() => {
            setCancellingVisit(null);
            setCancelReason('');
          }}
          title="Cancel Home Visit"
          size="sm"
          showCloseButton={false}
        >
          <FormField label="Reason for Cancellation" htmlFor={`cancel-reason-${cancelTarget.id}`}>
            <TextArea
              id={`cancel-reason-${cancelTarget.id}`}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Why is this visit being cancelled?"
              rows={3}
              required
              aria-required="true"
            />
          </FormField>
          <div className={styles.formActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setCancellingVisit(null);
                setCancelReason('');
              }}
            >
              Keep Visit
            </Button>
            <Button
              variant="danger"
              onClick={() => onCancelVisit(cancelTarget.id)}
              disabled={!cancelReason.trim()}
            >
              Confirm Cancellation
            </Button>
          </div>
        </Modal>
      )}

      {/* Visit Details Modal */}
      {detailVisit && (
        <Modal isOpen onClose={() => setViewingVisit(null)} title="Visit Details" size="md">
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Original Date</span>
            <span className={styles.fieldValue}>
              {formatDate(detailVisit.scheduledDate)} at {detailVisit.scheduledTime}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Staff Member</span>
            <span className={styles.fieldValue}>{detailVisit.assignedStaff}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Status</span>
            <span className={styles.fieldValue}>{statusBadge(detailVisit.status)}</span>
          </div>
          {detailVisit.outcome && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Outcome</span>
              <span className={styles.fieldValue}>{outcomeBadge(detailVisit.outcome)}</span>
            </div>
          )}
          {detailVisit.cancelReason && (
            <div className={styles.fieldVertical}>
              <span className={styles.fieldLabel}>Cancellation Reason</span>
              <div className={styles.fieldValueFullWidth}>{detailVisit.cancelReason}</div>
            </div>
          )}
          {detailVisit.completedAt && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Completed At</span>
              <span className={styles.fieldValue}>{formatDateAtTime(detailVisit.completedAt)}</span>
            </div>
          )}
          {detailVisit.cancelledAt && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Cancelled At</span>
              <span className={styles.fieldValue}>{formatDateAtTime(detailVisit.cancelledAt)}</span>
            </div>
          )}
          {detailVisit.notes && (
            <div className={styles.fieldVertical}>
              <span className={styles.fieldLabel}>Visit Summary</span>
              <div className={styles.fieldValueFullWidth}>{detailVisit.notes}</div>
            </div>
          )}
          {detailVisit.outcomeNotes && (
            <div className={styles.fieldVertical}>
              <span className={styles.fieldLabel}>Outcome Notes</span>
              <div className={styles.fieldValueFullWidth}>{detailVisit.outcomeNotes}</div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
