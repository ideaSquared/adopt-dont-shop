import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { X } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  FormField,
  Modal,
  SelectInput,
  Spinner,
  StatusBadge,
  Tabs,
  TextArea,
  toast,
  useConfirm,
} from '@adopt-dont-shop/lib.components';
import { getStatusDisplay } from '@adopt-dont-shop/lib.types';
import { useStaff } from '../../hooks/useStaff';
import { useActiveFosterPlacement } from './useActiveFosterPlacement';
import StageTransitionModal from './StageTransitionModal';
import { ApplicationStage, STAGE_CONFIG, StageAction } from '../../types/applicationStages';
import { VisitSchedulingContainer } from './VisitScheduling/VisitSchedulingContainer';
import { ReferenceChecksContainer } from './ReferenceChecks/ReferenceChecksContainer';
import { ApplicationTimelineContainer } from './ApplicationTimeline/ApplicationTimelineContainer';
import { ApplicationDetails } from './ApplicationDetails/ApplicationDetails';
import { extractReferences } from './extractReferences';
import * as styles from './ApplicationReview.css';
import type { ApplicationReviewProps } from './applicationReviewTypes';

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  submitted: ['approved', 'rejected', 'withdrawn'],
  approved: [],
  rejected: [],
  withdrawn: [],
  expired: [],
};

const statusLabel = (status: string): string => getStatusDisplay('application', status).label;

const getValidStatusOptions = (currentStatus: string): string[] =>
  VALID_STATUS_TRANSITIONS[currentStatus] || [];

const ApplicationReview: React.FC<ApplicationReviewProps> = ({
  application,
  homeVisits,
  timeline,
  timelineError = null,
  referencesError = null,
  homeVisitsError = null,
  loading,
  error,
  onClose,
  onStatusUpdate,
  onStageTransition,
  onReferenceUpdate,
  onScheduleVisit,
  onUpdateVisit,
  onAddTimelineEvent,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [statusNotes, setStatusNotes] = useState('');
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [localApplicationStatus, setLocalApplicationStatus] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStageTransition, setShowStageTransition] = useState(false);

  const petIdForLinks = application?.petId;
  const activePlacementForPet = useActiveFosterPlacement(petIdForLinks);

  useEffect(() => {
    setLocalApplicationStatus(null);
  }, [application?.id]);

  useEffect(() => {
    if (
      application?.status &&
      localApplicationStatus &&
      application.status !== localApplicationStatus
    ) {
      setLocalApplicationStatus(null);
    }
  }, [application?.status, localApplicationStatus]);

  const { confirm, confirmProps } = useConfirm();
  const { staff, loading: staffLoading } = useStaff();

  const getData = (path: string): unknown => {
    const keys = path.split('.');
    const traverse = (start: unknown): unknown =>
      keys.reduce<unknown>((cur, key) => {
        if (cur === null || cur === undefined || typeof cur !== 'object') {
          return undefined;
        }
        return (cur as Record<string, unknown>)[key];
      }, start);
    const flat = traverse(application?.data);
    return flat !== undefined ? flat : traverse(application?.data?.['data']);
  };

  const getStr = (path: string): string => (getData(path) as string | null | undefined) ?? '';
  const rawAnswers = getData('answers');
  const answers: Record<string, unknown> =
    typeof rawAnswers === 'object' && rawAnswers !== null && !Array.isArray(rawAnswers)
      ? Object.fromEntries(Object.entries(rawAnswers))
      : {};

  const extractedReferences = useMemo(
    () => extractReferences(application, getData),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getData depends only on application
    [application]
  );

  const getCurrentStatus = (): string => localApplicationStatus || application?.status || 'unknown';
  const getCurrentStage = (): ApplicationStage => application?.stage || 'PENDING';

  const handleStatusUpdate = async () => {
    if (newStatus === 'rejected') {
      const ok = await confirm({
        title: 'Reject this application?',
        message:
          'The applicant will be notified by email. This action cannot be undone via the status dropdown.',
        confirmText: 'Reject application',
        cancelText: 'Cancel',
        variant: 'danger',
      });
      if (!ok) {
        return;
      }
    } else if (newStatus === 'approved') {
      const ok = await confirm({
        title: 'Approve this application?',
        message:
          'The applicant will be notified by email that their application has been approved. This action cannot be undone via the status dropdown.',
        confirmText: 'Approve application',
        cancelText: 'Cancel',
        variant: 'info',
      });
      if (!ok) {
        return;
      }
    }
    try {
      setIsUpdatingStatus(true);
      await onStatusUpdate(newStatus, statusNotes);
      setLocalApplicationStatus(newStatus);
      onRefresh?.();
      setShowStatusUpdate(false);
      setStatusNotes('');
      setNewStatus('');
    } catch (err) {
      console.error('Failed to update application status:', err);
      toast.error(
        `Failed to update application status: ${err instanceof Error ? err.message : 'Unknown error'}`,
        { action: { label: 'Retry', onClick: handleStatusUpdate } }
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleStatusUpdate = () => {
    setShowStatusUpdate(prev => !prev);
    if (!showStatusUpdate) {
      setNewStatus('');
      setStatusNotes('');
    }
  };

  const handleStageTransition = async (action: StageAction, notes?: string) => {
    try {
      await onStageTransition(action, notes);
      setShowStageTransition(false);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to transition stage:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <Modal isOpen onClose={onClose} title="Loading application details..." size="sm">
        <div className={styles.loadingContainer}>
          <Spinner label="Loading application details" />
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal isOpen onClose={onClose} title="Error loading application" size="sm">
        <p className={styles.errorMessage}>{error}</p>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal>
    );
  }

  if (!application) {
    return null;
  }

  const currentStatus = getCurrentStatus();
  const hasStatusOptions = getValidStatusOptions(currentStatus).length > 0;

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={`Application for ${application.petName || 'Unknown Pet'}`}
        size="xl"
        showCloseButton={false}
        closeOnEscape={!showStageTransition && !confirmProps.isOpen}
      >
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <p className={styles.headerSubtitle}>
                Submitted by{' '}
                {application.applicantName ||
                  application.userName ||
                  `${getStr('personalInfo.firstName') || 'Unknown'} ${getStr('personalInfo.lastName') || ''}`.trim() ||
                  'Unknown Applicant'}{' '}
                •{' '}
                {application.submittedDaysAgo !== undefined
                  ? application.submittedDaysAgo === 0
                    ? 'Today'
                    : `${application.submittedDaysAgo} days ago`
                  : application.submittedAt
                    ? `${Math.floor((Date.now() - new Date(application.submittedAt).getTime()) / 86400000)} days ago`
                    : 'Recently'}
              </p>
              {petIdForLinks && (
                <p className={styles.headerSubtitle}>
                  <Link to={`/pets/${petIdForLinks}`}>View pet card</Link>
                  {activePlacementForPet && (
                    <>
                      {' · '}
                      <Link to={`/foster?petId=${petIdForLinks}`}>View foster placement</Link>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className={styles.headerRight}>
              <span
                className={styles.stageBadge}
                style={{ background: STAGE_CONFIG[getCurrentStage()]?.color || '#9ca3af' }}
              >
                {STAGE_CONFIG[getCurrentStage()]?.emoji}{' '}
                {STAGE_CONFIG[getCurrentStage()]?.label || getCurrentStage()}
              </span>
              <StatusBadge
                kind="application"
                status={currentStatus}
                label={currentStatus !== 'unknown' ? statusLabel(currentStatus) : 'Unknown Status'}
              />
              <Button onClick={() => setShowStageTransition(true)}>Transition Stage</Button>
              <Button variant="secondary" onClick={toggleStatusUpdate}>
                Update Status
              </Button>
              <Button variant="secondary" onClick={onClose} aria-label="Close">
                <X size="1em" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        {/* Status Update Panel */}
        {showStatusUpdate && (
          <div className={styles.statusUpdateContainer}>
            <div className={styles.formField}>
              <SelectInput
                label="New Status"
                value={newStatus}
                onChange={value => setNewStatus(typeof value === 'string' ? value : '')}
                placeholder="Select new status..."
                options={getValidStatusOptions(currentStatus).map(status => ({
                  value: status,
                  label: statusLabel(status),
                }))}
                fullWidth
              />
              {!hasStatusOptions && (
                <p className={styles.noStatusOptionsText}>
                  No status changes available for {statusLabel(currentStatus)}.
                </p>
              )}
            </div>
            <div className={styles.formField}>
              <FormField label="Notes (optional)" htmlFor="status-notes">
                <TextArea
                  id="status-notes"
                  value={statusNotes}
                  onChange={e => setStatusNotes(e.target.value)}
                  placeholder="Add any notes about this status change..."
                />
              </FormField>
            </div>
            <div className={styles.buttonGroup}>
              <Button variant="secondary" onClick={() => setShowStatusUpdate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={!newStatus || !hasStatusOptions || isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        )}

        <Tabs
          className={styles.content}
          aria-label="Application sections"
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            {
              id: 'details',
              label: 'Application Details',
              content: <ApplicationDetails answers={answers} rescueId={application.rescueId} />,
            },
            {
              id: 'references',
              label: `References (${extractedReferences.length})`,
              content: (
                <ReferenceChecksContainer
                  references={extractedReferences}
                  referencesError={referencesError}
                  applicationId={application.id}
                  onReferenceUpdate={onReferenceUpdate}
                />
              ),
            },
            {
              id: 'visits',
              label: `Home Visits (${homeVisits.length})`,
              content: (
                <VisitSchedulingContainer
                  homeVisits={homeVisits}
                  homeVisitsError={homeVisitsError}
                  staff={staff}
                  staffLoading={staffLoading}
                  onScheduleVisit={onScheduleVisit}
                  onUpdateVisit={onUpdateVisit}
                  onRefresh={onRefresh}
                />
              ),
            },
            {
              id: 'timeline',
              label: `Timeline (${timeline.length})`,
              content: (
                <ApplicationTimelineContainer
                  timeline={timeline}
                  timelineError={timelineError}
                  onAddTimelineEvent={onAddTimelineEvent}
                />
              ),
            },
          ]}
        />
      </Modal>

      {showStageTransition && (
        <StageTransitionModal
          currentStage={getCurrentStage()}
          onClose={() => setShowStageTransition(false)}
          onTransition={handleStageTransition}
        />
      )}

      <ConfirmDialog {...confirmProps} data-testid="reject-confirm-dialog" />
    </>
  );
};

export default ApplicationReview;
